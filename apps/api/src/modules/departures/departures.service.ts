import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  DepartureStatus,
  Prisma,
  TourDeparture,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { ListDeparturesQueryDto } from './dto/list-departures-query.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';

/** Outcome of the auto-refund pass a CANCELLED transition runs (API-W2). */
export interface DepartureCancellationSummary {
  /** PAID bookings the pass attempted to refund. */
  paidTotal: number;
  refunded: number;
  /** PARTIALLY_REFUNDED bookings left for manual follow-up (codes). */
  skipped: string[];
  failed: { code: string; message: string }[];
}

export type UpdatedDeparture = TourDeparture & {
  cancellation?: DepartureCancellationSummary;
};

/**
 * CRUD for `TourDeparture` rows nested under a parent tour. Ported from the
 * donor (its date/seat logic is sound), plus our `compareAtPrice` (D-P1.3).
 *
 * Two surfaces share this service:
 *  - **Public** (`findPublicListForTour`) — gates on `tour.isPublished`, defaults
 *    `from = today` and `status = OPEN`; users never see past/cancelled rows
 *    unless they opt in.
 *  - **Admin** (`findAdminListForTour`) — honours every filter literally, no
 *    `isPublished` gate, no implicit `from`. Full history for audit.
 *
 * Capacity invariant `seatsTotal >= seatsBooked` is enforced on update.
 * `seatsBooked` is never client-settable — mutated only by the booking flow
 * (P1.5) under tx + row lock. Exported for that module.
 */
@Injectable()
export class DeparturesService {
  private readonly logger = new Logger(DeparturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  // ── Reads — public ──────────────────────────────────────────────────────────

  async findPublicListForTour(
    slug: string,
    query: ListDeparturesQueryDto,
  ): Promise<TourDeparture[]> {
    const tour = await this.findPublishedTourBySlugOrThrow(slug);

    const from = query.from ? new Date(query.from) : this.startOfToday();
    const status = query.status ?? DepartureStatus.OPEN;

    return this.prisma.tourDeparture.findMany({
      where: {
        tourId: tour.id,
        startDate: this.buildDateFilter(from, query.to),
        status,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  // ── Reads — admin ───────────────────────────────────────────────────────────

  async findAdminListForTour(
    slug: string,
    query: ListDeparturesQueryDto,
  ): Promise<TourDeparture[]> {
    const tour = await this.findTourBySlugOrThrow(slug);

    return this.prisma.tourDeparture.findMany({
      where: {
        tourId: tour.id,
        ...(query.from || query.to
          ? {
              startDate: this.buildDateFilter(
                query.from ? new Date(query.from) : undefined,
                query.to,
              ),
            }
          : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { startDate: 'asc' },
    });
  }

  // ── Mutations — admin ───────────────────────────────────────────────────────

  async create(slug: string, body: CreateDepartureDto): Promise<TourDeparture> {
    const tour = await this.findTourBySlugOrThrow(slug);
    this.assertDateRange(body.startDate, body.endDate);
    // A departure must not be born already departed (same-day allowed — walk-ins).
    this.assertNotPast(body.startDate);

    const departure = await this.prisma.tourDeparture.create({
      data: {
        tour: { connect: { id: tour.id } },
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        seatsTotal: body.seatsTotal,
        // `seatsBooked` is intentionally omitted (schema default 0) — a
        // client-settable counter would make seat oversell trivial.
        priceOverride: this.toDecimalOrNull(body.priceOverride),
        compareAtPrice: this.toDecimalOrNull(body.compareAtPrice),
        status: body.status ?? DepartureStatus.OPEN,
      },
    });

    this.logger.log(
      `Created departure ${departure.id} for tour ${slug} (start=${departure.startDate
        .toISOString()
        .slice(0, 10)})`,
    );
    return departure;
  }

  async update(
    slug: string,
    id: string,
    body: UpdateDepartureDto,
    adminUserId?: string | null,
  ): Promise<UpdatedDeparture> {
    const existing = await this.findDepartureOrThrow(slug, id);

    // API-W2: flipping to CANCELLED triggers the auto-refund pass below, which
    // audits each refund with the admin's local user id — require it up front.
    const cancelling =
      body.status === DepartureStatus.CANCELLED &&
      existing.status !== DepartureStatus.CANCELLED;
    if (cancelling && !adminUserId) {
      throw new BadRequestException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before cancelling a departure',
      });
    }

    // Validate the date range against existing values when only one date is
    // sent — otherwise patching just `startDate` could silently invert it.
    if (body.startDate !== undefined || body.endDate !== undefined) {
      const nextStart = body.startDate ?? existing.startDate.toISOString();
      const nextEnd = body.endDate ?? existing.endDate.toISOString();
      this.assertDateRange(nextStart, nextEnd);
    }

    // A departure may not be MOVED into the past — but only guard when the caller
    // is actually changing `startDate`. Editing other fields on an already-past
    // departure (e.g. marking a finished trip CANCELLED, correcting seats) stays
    // allowed, so history can be tidied. Same-day is fine (walk-in parity).
    if (body.startDate !== undefined) {
      this.assertNotPast(body.startDate);
    }

    if (
      body.seatsTotal !== undefined &&
      body.seatsTotal < existing.seatsBooked
    ) {
      throw new BadRequestException({
        code: 'SEATS_TOTAL_BELOW_BOOKED',
        message: `Cannot reduce seatsTotal to ${body.seatsTotal} — ${existing.seatsBooked} seats are already booked`,
      });
    }

    const updated = await this.prisma.tourDeparture.update({
      where: { id: existing.id },
      data: this.mapUpdatePayload(body),
    });

    if (!cancelling) return updated;
    const cancellation = await this.runCancellationPass(
      existing.id,
      adminUserId as string,
    );
    return { ...updated, cancellation };
  }

  /**
   * The trip is off (status already flipped — the operator's fact): kill
   * in-flight PENDING bookings so a late payment webhook loses its seat-claim
   * gate (its existing race path then auto-refunds the capture), then refund
   * every PAID booking through the proven per-booking admin refund pipeline
   * (provider-first, idempotent per booking, BOOKING_REFUNDED email). A failed
   * provider refund leaves that booking PAID — reported in the summary and
   * retryable from the admin bookings screen as today. Sequential on purpose:
   * pooler- and provider-rate-friendly at our departure sizes.
   */
  private async runCancellationPass(
    departureId: string,
    adminUserId: string,
  ): Promise<DepartureCancellationSummary> {
    const pendingKilled = await this.prisma.booking.updateMany({
      where: { departureId, status: BookingStatus.PENDING },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
    if (pendingKilled.count > 0) {
      this.logger.log(
        `Departure ${departureId} cancel: ${pendingKilled.count} PENDING booking(s) cancelled`,
      );
    }

    const active = await this.prisma.booking.findMany({
      where: {
        departureId,
        status: {
          in: [BookingStatus.PAID, BookingStatus.PARTIALLY_REFUNDED],
        },
      },
      select: { code: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    const paid = active.filter((b) => b.status === BookingStatus.PAID);
    const skipped = active
      .filter((b) => b.status === BookingStatus.PARTIALLY_REFUNDED)
      .map((b) => b.code);

    const failed: { code: string; message: string }[] = [];
    let refunded = 0;
    for (const booking of paid) {
      try {
        await this.bookings.refundByAdmin({
          code: booking.code,
          adminUserId,
          reason: 'Departure cancelled by the operator',
        });
        refunded += 1;
      } catch (err) {
        failed.push({
          code: booking.code,
          message: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    this.logger.log(
      `Departure ${departureId} cancel: ${refunded}/${paid.length} refunded, ` +
        `${skipped.length} partial skipped, ${failed.length} failed`,
    );
    return { paidTotal: paid.length, refunded, skipped, failed };
  }

  async remove(slug: string, id: string): Promise<TourDeparture> {
    const existing = await this.findDepartureOrThrow(slug, id);

    // Refuse delete when seats are sold — admins should mark CANCELLED via PATCH
    // (preserves booking history). The DB FK (Booking.departureId, Restrict) is
    // the backstop against a race between this read and the delete.
    if (existing.seatsBooked > 0) {
      throw new ConflictException({
        code: 'DEPARTURE_HAS_BOOKINGS',
        message:
          `Cannot delete departure with ${existing.seatsBooked} booked seats. ` +
          'Mark it CANCELLED instead so booking history is preserved.',
      });
    }

    try {
      await this.prisma.tourDeparture.delete({ where: { id: existing.id } });
      this.logger.log(`Deleted departure ${existing.id} (tour=${slug})`);
      return existing;
    } catch (err) {
      if (this.isForeignKeyError(err)) {
        throw new ConflictException({
          code: 'DEPARTURE_HAS_BOOKINGS',
          message: 'Cannot delete departure — bookings reference it.',
        });
      }
      throw err;
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  /** Resolves a tour by slug (id only); 404 `TOUR_NOT_FOUND` if missing. */
  private async findTourBySlugOrThrow(slug: string): Promise<{ id: string }> {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tour) throw this.tourNotFound(slug);
    return tour;
  }

  /** Public-flavoured tour lookup — also gates on `isPublished`. */
  private async findPublishedTourBySlugOrThrow(
    slug: string,
  ): Promise<{ id: string }> {
    const tour = await this.prisma.tour.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    if (!tour) throw this.tourNotFound(slug);
    return tour;
  }

  /**
   * Resolves `(slug, departureId)` to a full row. Distinct 404 codes so the FE
   * can tell "tour deleted" from "departure deleted from a live tour".
   */
  private async findDepartureOrThrow(
    slug: string,
    id: string,
  ): Promise<TourDeparture> {
    const tour = await this.findTourBySlugOrThrow(slug);
    const departure = await this.prisma.tourDeparture.findFirst({
      where: { id, tourId: tour.id },
    });
    if (!departure) {
      throw new NotFoundException({
        code: 'DEPARTURE_NOT_FOUND',
        message: `Departure "${id}" not found for tour "${slug}"`,
      });
    }
    return departure;
  }

  /**
   * Throws 400 `DEPARTURE_IN_PAST` when `startDate` is before today. UTC calendar-date compare
   * (mirrors the booking flow's "past" guard and is server-timezone independent). Same-day is allowed
   * (walk-in sales). Shared by create + update so a departure can neither be born nor moved into the
   * past.
   */
  private assertNotPast(startDate: string): void {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const startUtc = new Date(startDate).toISOString().slice(0, 10);
    if (startUtc < todayUtc) {
      throw new BadRequestException({
        code: 'DEPARTURE_IN_PAST',
        message: `startDate ${startUtc} is in the past — departures must start today or later`,
      });
    }
  }

  /** Throws 400 `INVALID_DATE_RANGE` when `endDate < startDate`. */
  private assertDateRange(startDate: string, endDate: string): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: `endDate (${endDate}) must be on or after startDate (${startDate})`,
      });
    }
  }

  /** Inclusive `from`/`to` → Prisma date filter; `{}` when both absent. */
  private buildDateFilter(
    from: Date | undefined,
    to: string | undefined,
  ): Prisma.DateTimeFilter {
    const filter: Prisma.DateTimeFilter = {};
    if (from) filter.gte = from;
    if (to) filter.lte = new Date(to);
    return filter;
  }

  /** Start of the current calendar day in UTC. */
  private startOfToday(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  /**
   * Partial update payload, skipping fields the caller didn't send. Price fields
   * accept explicit `null` (clears the override) — distinguish absent vs null.
   */
  private mapUpdatePayload(
    body: UpdateDepartureDto,
  ): Prisma.TourDepartureUpdateInput {
    const data: Prisma.TourDepartureUpdateInput = {};
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
    if (body.seatsTotal !== undefined) data.seatsTotal = body.seatsTotal;
    if (body.priceOverride !== undefined) {
      data.priceOverride = this.toDecimalOrNull(body.priceOverride);
    }
    if (body.compareAtPrice !== undefined) {
      data.compareAtPrice = this.toDecimalOrNull(body.compareAtPrice);
    }
    if (body.status !== undefined) data.status = body.status;
    return data;
  }

  /** `undefined`/`null` → `null`; a number → `Prisma.Decimal`. */
  private toDecimalOrNull(
    value: number | null | undefined,
  ): Prisma.Decimal | null {
    return value === undefined || value === null
      ? null
      : new Prisma.Decimal(value);
  }

  private tourNotFound(slug: string): NotFoundException {
    return new NotFoundException({
      code: 'TOUR_NOT_FOUND',
      message: `Tour "${slug}" not found`,
    });
  }

  private isForeignKeyError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2003'
    );
  }
}
