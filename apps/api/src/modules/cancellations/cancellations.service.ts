import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancellationRequestStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { DenyCancellationRequestDto } from './dto/deny-cancellation-request.dto';
import { ListCancellationRequestsQueryDto } from './dto/list-cancellation-requests-query.dto';
import {
  AdminCancellationRequestDto,
  CancellationRequestSummaryDto,
  PaginatedCancellationRequestsDto,
} from './dto/cancellation-request.dto';

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

  /**
   * Admin queue: paginated list of cancellation requests, defaulting to the
   * open (REQUESTED) queue, newest first. Uses `Promise.all` (not a batch
   * `$transaction`) — pooler-safe for parallel reads.
   */
  async findAllForAdmin(
    query: ListCancellationRequestsQueryDto,
  ): Promise<PaginatedCancellationRequestsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CancellationRequestWhereInput = {
      status: query.status ?? CancellationRequestStatus.REQUESTED,
    };
    const [rows, total] = await Promise.all([
      this.prisma.cancellationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, status: true, reason: true, createdAt: true, decidedAt: true, decisionNote: true,
          booking: {
            select: {
              code: true, contactName: true, contactEmail: true,
              tour: { select: { title: true } },
              departure: { select: { startDate: true } },
            },
          },
        },
      }),
      this.prisma.cancellationRequest.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
        decisionNote: r.decisionNote,
        booking: {
          code: r.booking.code,
          tourTitle: r.booking.tour.title,
          departureStartDate: r.booking.departure.startDate.toISOString().slice(0, 10),
          customerName: r.booking.contactName,
          customerEmail: r.booking.contactEmail,
        },
      })),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  /**
   * Admin denies an open cancellation request. 404 if missing, 409 if not
   * REQUESTED. Sets DENIED + audit (decidedById/decidedAt) and enqueues a
   * CANCELLATION_DENIED outbox row. The booking itself is untouched (stays
   * PAID) — deny does not cancel the booking.
   */
  async denyRequest(
    id: string,
    adminUserId: string,
    dto: DenyCancellationRequestDto,
  ): Promise<AdminCancellationRequestDto> {
    // Atomic transition: only an open REQUESTED row flips to DENIED. This gates
    // the transition in SQL so a concurrent refund-resolution can't be clobbered.
    const claim = await this.prisma.cancellationRequest.updateMany({
      where: { id, status: CancellationRequestStatus.REQUESTED },
      data: {
        status: CancellationRequestStatus.DENIED,
        decisionNote: dto.decisionNote?.trim() || null,
        decidedById: adminUserId,
        decidedAt: new Date(),
      },
    });
    if (claim.count === 0) {
      // Distinguish a missing request (404) from one already resolved (409).
      const exists = await this.prisma.cancellationRequest.findUnique({
        where: { id }, select: { status: true },
      });
      if (!exists) {
        throw new NotFoundException({ code: 'CANCELLATION_REQUEST_NOT_FOUND', message: `Request "${id}" not found` });
      }
      throw new ConflictException({
        code: 'CANCELLATION_NOT_PENDING',
        message: `Request is ${exists.status}; only an open request can be denied`,
      });
    }
    // Claim won — enqueue the denial email (idempotent) and read back for the response.
    await this.prisma.outbox.createMany({
      data: [{
        type: 'CANCELLATION_DENIED',
        payload: { requestId: id } as Prisma.InputJsonValue,
        dedupeKey: `cancellation-denied:${id}`,
      }],
      skipDuplicates: true,
    });
    const updated = await this.prisma.cancellationRequest.findUnique({
      where: { id },
      select: {
        id: true, status: true, reason: true, createdAt: true, decidedAt: true, decisionNote: true,
        booking: {
          select: {
            code: true, contactName: true, contactEmail: true,
            tour: { select: { title: true } },
            departure: { select: { startDate: true } },
          },
        },
      },
    });
    if (!updated) {
      throw new NotFoundException({ code: 'CANCELLATION_REQUEST_NOT_FOUND', message: `Request "${id}" not found` });
    }
    this.logger.log(`Cancellation request ${id} denied (by ${adminUserId})`);
    return {
      id: updated.id, status: updated.status, reason: updated.reason,
      createdAt: updated.createdAt.toISOString(),
      decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
      decisionNote: updated.decisionNote,
      booking: {
        code: updated.booking.code,
        tourTitle: updated.booking.tour.title,
        departureStartDate: updated.booking.departure.startDate.toISOString().slice(0, 10),
        customerName: updated.booking.contactName,
        customerEmail: updated.booking.contactEmail,
      },
    };
  }
}
