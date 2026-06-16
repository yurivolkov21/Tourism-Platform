import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  DepartureStatus,
  Prisma,
  TourDeparture,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mintBookingCode } from './booking-code';
import { CreateBookingDto } from './dto/create-booking.dto';

/** Relations embedded on a booking payload (EN-only: single `title`). */
const BOOKING_INCLUDE: Prisma.BookingInclude = {
  tour: { select: { slug: true, title: true } },
  departure: { select: { startDate: true, endDate: true } },
};

/** Identity of the calling user, for owner-or-admin authorization. */
interface Caller {
  id: string;
  role: UserRole;
}

/**
 * Customer bookings — lifecycle up to (not including) payment (P1.5a).
 *
 * Seat-reservation timing (ADR-0006 / donor): seats are **not** held at PENDING.
 * The authoritative reservation (atomic increment of `seatsBooked`, oversell-
 * guarded) happens at payment confirmation (P1.5b webhook). The soft seat-check
 * here only short-circuits an obviously-full departure before checkout — it is
 * best-effort, not a guarantee.
 *
 * Reads are owner-or-admin; non-owners and missing codes both collapse to 404
 * (`BOOKING_NOT_FOUND`) so a code's existence can't be probed by enumeration.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Mutations ───────────────────────────────────────────────────────────────

  /**
   * Creates a PENDING booking. Resolves the published tour + OPEN, not-past
   * departure, soft-checks capacity, computes the total, mints a unique code,
   * and stores the chosen `paymentProvider`. The checkout session is minted
   * later (P1.5b/c).
   */
  async create(customerUserId: string, body: CreateBookingDto): Promise<Booking> {
    const tour = await this.prisma.tour.findFirst({
      where: { slug: body.tourSlug, isPublished: true },
      select: { id: true, slug: true, title: true, currency: true, basePrice: true },
    });
    if (!tour) {
      throw new NotFoundException({
        code: 'TOUR_NOT_FOUND',
        message: `Tour "${body.tourSlug}" not found`,
      });
    }

    const departure = await this.prisma.tourDeparture.findFirst({
      where: { id: body.departureId, tourId: tour.id },
    });
    if (!departure) {
      throw new NotFoundException({
        code: 'DEPARTURE_NOT_FOUND',
        message: `Departure "${body.departureId}" not found for tour "${body.tourSlug}"`,
      });
    }
    if (departure.status !== DepartureStatus.OPEN) {
      throw new BadRequestException({
        code: 'DEPARTURE_NOT_OPEN',
        message: `Departure is ${departure.status} — bookings closed`,
      });
    }
    // OPEN alone isn't enough: an operator who forgets to close an old departure
    // must not leave it bookable. Same-day stays bookable (walk-in); only strictly
    // past start dates are rejected. UTC calendar-date compare (`@db.Date` loads
    // as UTC midnight); string compare is server-timezone independent.
    const todayUtc = new Date().toISOString().slice(0, 10);
    const startUtc = departure.startDate.toISOString().slice(0, 10);
    if (startUtc < todayUtc) {
      throw new BadRequestException({
        code: 'DEPARTURE_DEPARTED',
        message: 'This departure has already started — bookings closed',
      });
    }

    const totalSeats = body.numAdults + (body.numChildren ?? 0);
    this.assertSeatsAvailable(departure, totalSeats);

    const effectiveUnitPrice = departure.priceOverride ?? tour.basePrice;
    const totalAmount = effectiveUnitPrice.mul(totalSeats);

    const code = await this.generateUniqueCode();
    const booking = await this.prisma.booking.create({
      data: {
        code,
        user: { connect: { id: customerUserId } },
        tour: { connect: { id: tour.id } },
        departure: { connect: { id: departure.id } },
        numAdults: body.numAdults,
        numChildren: body.numChildren ?? 0,
        totalAmount,
        currency: tour.currency,
        status: BookingStatus.PENDING,
        paymentProvider: body.paymentProvider,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        specialRequests: body.specialRequests,
      },
      include: BOOKING_INCLUDE,
    });

    this.logger.log(
      `Created booking ${booking.code} (tour=${tour.slug}, seats=${totalSeats}, provider=${body.paymentProvider})`,
    );
    return booking;
  }

  /**
   * Cancels the caller's **PENDING** booking. Owner-or-admin (else 404). PAID
   * bookings go through the admin refund flow (P1.5b), not here — so a non-PENDING
   * booking is a 409. No seat change (none held at PENDING).
   */
  async cancelOwnPending(code: string, caller: Caller): Promise<Booking> {
    const booking = await this.loadOwnedOr404(code, caller);
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException({
        code: 'BOOKING_NOT_CANCELLABLE',
        message: `Booking is ${booking.status}; only PENDING bookings can be cancelled here`,
      });
    }
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      include: BOOKING_INCLUDE,
    });
    this.logger.log(`Cancelled booking ${booking.code} (by ${caller.id})`);
    return updated;
  }

  // ── Reads ───────────────────────────────────────────────────────────────────

  /** The caller's bookings, newest first, capped at 50 (pagination when needed). */
  findOwnList(customerUserId: string): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: { userId: customerUserId },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** One booking by code — owner-or-admin; non-owner/missing both → 404. */
  findByCodeForCaller(code: string, caller: Caller): Promise<Booking> {
    return this.loadOwnedOr404(code, caller);
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  /**
   * Loads a booking by code and enforces owner-or-admin. Non-owners (and missing
   * codes) collapse into the same 404 so code existence isn't leaked to
   * enumeration attacks.
   */
  private async loadOwnedOr404(code: string, caller: Caller): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: BOOKING_INCLUDE,
    });
    const isOwner = booking?.userId === caller.id;
    const isAdmin = caller.role === UserRole.ADMIN;
    if (!booking || (!isOwner && !isAdmin)) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${code}" not found`,
      });
    }
    return booking;
  }

  /** Best-effort capacity guard at create time (not a reservation). */
  private assertSeatsAvailable(
    departure: TourDeparture,
    totalSeats: number,
  ): void {
    const remaining = departure.seatsTotal - departure.seatsBooked;
    if (remaining < totalSeats) {
      throw new ConflictException({
        code: 'SEATS_NOT_AVAILABLE',
        message: `Only ${remaining} seat(s) left, requested ${totalSeats}`,
      });
    }
  }

  /** Mints a unique booking code; retries once on the rare UNIQUE collision. */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const candidate = mintBookingCode();
      const existing = await this.prisma.booking.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    throw new Error('Failed to generate a unique booking code after 2 tries');
  }
}
