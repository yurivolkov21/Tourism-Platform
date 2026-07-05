import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancellationRequestStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { CancellationRequestSummaryDto } from './dto/cancellation-request.dto';

export interface Caller {
  id: string;
  role: UserRole;
}

@Injectable()
export class CancellationsService {
  private readonly logger = new Logger(CancellationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A PAID customer requests to cancel their booking. Owner-only (else 404).
   * Blocked once the departure has started, and while an open request exists.
   * A prior DENIED request is reused (reset to REQUESTED). Enqueues a
   * CANCELLATION_REQUESTED outbox row (email deferred; the row is written now).
   */
  async createRequest(
    code: string,
    caller: Caller,
    dto: CreateCancellationRequestDto,
  ): Promise<CancellationRequestSummaryDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      select: {
        id: true,
        userId: true,
        status: true,
        departure: { select: { startDate: true } },
        cancellationRequest: { select: { status: true } },
      },
    });
    // Owner-or-404 (never leak existence to a non-owner). Admins don't use this route.
    if (!booking || booking.userId !== caller.id) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking "${code}" not found` });
    }
    if (booking.status !== 'PAID') {
      throw new ConflictException({
        code: 'CANCELLATION_NOT_ALLOWED',
        message: `Booking is ${booking.status}; only a PAID booking can be cancelled by request`,
      });
    }
    if (booking.departure.startDate.getTime() <= Date.now()) {
      throw new ConflictException({
        code: 'DEPARTURE_ALREADY_STARTED',
        message: 'This departure has already started; contact support directly',
      });
    }
    if (booking.cancellationRequest?.status === CancellationRequestStatus.REQUESTED) {
      throw new ConflictException({
        code: 'CANCELLATION_ALREADY_REQUESTED',
        message: 'A cancellation request is already open for this booking',
      });
    }

    const reason = dto.reason?.trim() ?? '';
    const [request] = await this.prisma.$transaction([
      this.prisma.cancellationRequest.upsert({
        where: { bookingId: booking.id },
        create: { bookingId: booking.id, userId: caller.id, reason, status: CancellationRequestStatus.REQUESTED },
        update: { reason, status: CancellationRequestStatus.REQUESTED, decisionNote: null, decidedById: null, decidedAt: null },
        select: { status: true, reason: true, createdAt: true, decisionNote: true, decidedAt: true },
      }),
      this.prisma.outbox.createMany({
        data: [{
          type: 'CANCELLATION_REQUESTED',
          payload: { bookingId: booking.id } as Prisma.InputJsonValue,
          dedupeKey: `cancellation-requested:${booking.id}`,
        }],
        skipDuplicates: true,
      }),
    ]);
    this.logger.log(`Cancellation requested for booking ${code} (by ${caller.id})`);
    return {
      status: request.status,
      reason: request.reason,
      createdAt: request.createdAt.toISOString(),
      decisionNote: request.decisionNote,
      decidedAt: request.decidedAt ? request.decidedAt.toISOString() : null,
    };
  }
}
