import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Booking,
  BookingStatus,
  DepartureStatus,
  PaymentProvider,
  Prisma,
  TourDeparture,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toStripeMinorUnits } from '../payments/money';
import { StripeService } from '../payments/stripe.service';
import { mintBookingCode } from './booking-code';
import { CreateBookingDto } from './dto/create-booking.dto';

/** Result of `startCheckout` — the FE redirects the buyer to `checkoutUrl`. */
export interface CheckoutStarted {
  checkoutUrl: string;
  bookingCode: string;
  status: BookingStatus;
}

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

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
   * Mints a Stripe Checkout session for the caller's PENDING booking and returns
   * the redirect URL. Owner-or-admin (else 404); must be PENDING (409); provider
   * must be STRIPE (400 until PayPal lands in P1.5c). The Stripe call runs outside
   * any DB write (its HTTP latency must not hold a pooler connection);
   * `providerSessionId` is persisted after. A Stripe failure leaves the booking
   * PENDING (retryable) and surfaces 502 `CHECKOUT_FAILED`.
   */
  async startCheckout(code: string, caller: Caller): Promise<CheckoutStarted> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        userId: true,
        paymentProvider: true,
        currency: true,
        totalAmount: true,
        contactEmail: true,
        numAdults: true,
        numChildren: true,
        tour: { select: { title: true } },
      },
    });
    if (
      !booking ||
      (booking.userId !== caller.id && caller.role !== UserRole.ADMIN)
    ) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${code}" not found`,
      });
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException({
        code: 'BOOKING_NOT_PENDING',
        message: `Booking is ${booking.status}; only PENDING bookings can start checkout`,
      });
    }
    if (booking.paymentProvider !== PaymentProvider.STRIPE) {
      throw new BadRequestException({
        code: 'PROVIDER_NOT_AVAILABLE',
        message: `Checkout for ${booking.paymentProvider} is not available yet`,
      });
    }

    const frontendUrl = this.config.getOrThrow<string>('app.frontendUrl');
    const totalSeats = booking.numAdults + booking.numChildren;
    const unitAmount = toStripeMinorUnits(booking.totalAmount, booking.currency);

    let session: Awaited<ReturnType<StripeService['createCheckoutSession']>>;
    try {
      session = await this.stripe.createCheckoutSession({
        bookingId: booking.id,
        bookingCode: booking.code,
        customerEmail: booking.contactEmail,
        currency: booking.currency.toLowerCase(),
        unitAmount,
        quantity: 1,
        productName: booking.tour.title,
        productDescription: `Booking ${booking.code} — ${totalSeats} seat(s)`,
        successUrl: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${frontendUrl}/checkout/cancel?code=${booking.code}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`Stripe checkout failed for ${booking.code}: ${message}`);
      throw new BadGatewayException({
        code: 'CHECKOUT_FAILED',
        message: 'Could not start the payment session — please retry.',
      });
    }
    if (!session.url) {
      throw new BadGatewayException({
        code: 'CHECKOUT_FAILED',
        message: 'Stripe returned a session without a redirect URL.',
      });
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { providerSessionId: session.id },
    });
    this.logger.log(
      `Started checkout for ${booking.code} (session=${session.id})`,
    );
    return {
      checkoutUrl: session.url,
      bookingCode: booking.code,
      status: booking.status,
    };
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

  /**
   * Admin refund (`/admin/bookings/:code/refund`). The booking must be PAID with a
   * `providerPaymentId`. Calls Stripe **first** (authoritative — never flip the DB
   * for a refund that didn't happen); converges if Stripe says it's already
   * refunded. Then atomically releases seats + flips to REFUNDED (gated on PAID, so
   * a retry is a no-op). A Stripe failure surfaces 400 `REFUND_FAILED` and leaves
   * the booking PAID for the operator to retry.
   */
  async refundByAdmin(args: {
    code: string;
    reason?: string;
    adminUserId: string;
  }): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { code: args.code },
      select: {
        id: true,
        code: true,
        status: true,
        providerPaymentId: true,
        departureId: true,
        numAdults: true,
        numChildren: true,
      },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${args.code}" not found`,
      });
    }
    if (booking.status !== BookingStatus.PAID || !booking.providerPaymentId) {
      throw new BadRequestException({
        code: 'BOOKING_NOT_REFUNDABLE',
        message: `Booking is ${booking.status}; only a PAID booking with a captured payment can be refunded`,
      });
    }

    try {
      await this.stripe.createRefund({
        paymentIntentId: booking.providerPaymentId,
        reason: args.reason ?? 'requested_by_customer',
      });
    } catch (err) {
      if (!this.isAlreadyRefundedError(err)) {
        const message = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Stripe refund failed for ${booking.code}: ${message}`);
        throw new BadRequestException({
          code: 'REFUND_FAILED',
          message: `Stripe refund failed: ${message}`,
        });
      }
      this.logger.warn(
        `Stripe reports booking ${booking.code} already refunded — converging DB state`,
      );
    }

    const seats = booking.numAdults + booking.numChildren;
    // Atomic, idempotent (gated on status='PAID'): release seats + flip REFUNDED.
    await this.prisma.$queryRaw(Prisma.sql`
      WITH released AS (
        UPDATE tour_departures
        SET seats_booked = GREATEST(seats_booked - ${seats}, 0)
        WHERE id = ${booking.departureId}::uuid
          AND EXISTS (
            SELECT 1 FROM bookings
            WHERE id = ${booking.id}::uuid AND status = 'PAID'::"BookingStatus"
          )
        RETURNING id
      )
      UPDATE bookings
      SET status = 'REFUNDED'::"BookingStatus",
          cancelled_at = now(),
          refund_reason = ${args.reason ?? null},
          refunded_by = ${args.adminUserId}::uuid
      WHERE id = ${booking.id}::uuid AND status = 'PAID'::"BookingStatus"
      RETURNING id
    `);

    const updated = await this.prisma.booking.findUnique({
      where: { id: booking.id },
      include: BOOKING_INCLUDE,
    });
    if (!updated) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${args.code}" not found`,
      });
    }
    this.logger.log(
      `Admin refunded booking ${booking.code} (${seats} seat(s) released, by ${args.adminUserId})`,
    );
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

  /**
   * Stripe rejects a double-refund with `code: 'charge_already_refunded'` (on the
   * error object or its `raw`). That means the money is already back — converge.
   */
  private isAlreadyRefundedError(err: unknown): boolean {
    const code =
      (err as { code?: string })?.code ??
      (err as { raw?: { code?: string } })?.raw?.code;
    return code === 'charge_already_refunded';
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
