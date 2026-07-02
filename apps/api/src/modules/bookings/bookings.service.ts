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
import { toPayPalAmount, toStripeMinorUnits } from '../payments/money';
import { PaymentsService } from '../payments/payments.service';
import { PayPalService } from '../payments/paypal.service';
import { StripeService } from '../payments/stripe.service';
import { mintBookingCode } from './booking-code';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListAdminBookingsQueryDto } from './dto/list-admin-bookings-query.dto';

/** Result of `startCheckout` — the FE redirects the buyer to `checkoutUrl`. */
export interface CheckoutStarted {
  checkoutUrl: string;
  bookingCode: string;
  status: BookingStatus;
}

/** Paginated admin-bookings result; `TransformInterceptor` hoists `items`→`data` + `meta`. */
export interface PaginatedBookings {
  items: Booking[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Relations embedded on a booking payload (EN-only: single `title`). */
const BOOKING_INCLUDE: Prisma.BookingInclude = {
  tour: { select: { slug: true, title: true } },
  departure: { select: { startDate: true, endDate: true } },
};

/** Detail read adds the admin refunder + the customer account + departure capacity. */
const BOOKING_DETAIL_INCLUDE = {
  tour: { select: { slug: true, title: true } },
  departure: {
    select: { startDate: true, endDate: true, seatsTotal: true, seatsBooked: true },
  },
  refundedBy: { select: { fullName: true, email: true } },
  user: { select: { id: true, fullName: true, email: true, createdAt: true } },
} satisfies Prisma.BookingInclude;

type BookingWithDetail = Prisma.BookingGetPayload<{ include: typeof BOOKING_DETAIL_INCLUDE }>;

/** Another booking by the same customer — detail mini-list row. */
export interface OtherBookingItem {
  code: string;
  status: BookingStatus;
  createdAt: string;
  tourTitle: string;
  totalAmount: string;
  currency: string;
}

/**
 * Webhook event linked to a booking — METADATA ONLY (the JSONB payload holds
 * provider payment data / PII and is deliberately never selected).
 * `processedAt` null = the handler never finished — the prime debug signal.
 */
export interface PaymentEventSummary {
  id: string;
  provider: PaymentProvider;
  type: string;
  eventId: string;
  receivedAt: string;
  processedAt: string | null;
}

/** Raw `$queryRaw` row for the payment-event trail (dates still `Date`). */
interface PaymentEventRow {
  id: string;
  provider: PaymentProvider;
  type: string;
  eventId: string;
  receivedAt: Date;
  processedAt: Date | null;
}

/**
 * Admin booking detail — the full customer-facing shape plus admin-only audit
 * fields (lifecycle timestamps, captured payment ref, refund audit). Kept separate
 * from the shared `BookingDto` so these never leak to customer endpoints.
 */
export interface AdminBookingDetail {
  id: string;
  code: string;
  status: BookingStatus;
  numAdults: number;
  numChildren: number;
  totalAmount: string;
  currency: string;
  paymentProvider: PaymentProvider;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  specialRequests: string | null;
  tour: { slug: string; title: string };
  departure: { startDate: string; endDate: string; seatsTotal: number; seatsBooked: number };
  providerSessionId: string | null;
  customer: { id: string; fullName: string | null; email: string; createdAt: string };
  otherBookings: { total: number; items: OtherBookingItem[] };
  paymentEvents: PaymentEventSummary[];
  paidAt: string | null;
  cancelledAt: string | null;
  providerPaymentId: string | null;
  refundReason: string | null;
  refundedBy: { fullName: string | null; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Explicit allow-list mapper — no accidental passthrough of internal columns. */
function toAdminBookingDetail(
  b: BookingWithDetail,
): Omit<AdminBookingDetail, 'otherBookings' | 'paymentEvents'> {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    numAdults: b.numAdults,
    numChildren: b.numChildren,
    totalAmount: b.totalAmount.toString(),
    currency: b.currency,
    paymentProvider: b.paymentProvider,
    contactName: b.contactName,
    contactEmail: b.contactEmail,
    contactPhone: b.contactPhone,
    specialRequests: b.specialRequests,
    tour: { slug: b.tour.slug, title: b.tour.title },
    departure: {
      startDate: b.departure.startDate.toISOString(),
      endDate: b.departure.endDate.toISOString(),
      seatsTotal: b.departure.seatsTotal,
      seatsBooked: b.departure.seatsBooked,
    },
    providerSessionId: b.providerSessionId,
    customer: {
      id: b.user.id,
      fullName: b.user.fullName,
      email: b.user.email,
      createdAt: b.user.createdAt.toISOString(),
    },
    paidAt: b.paidAt ? b.paidAt.toISOString() : null,
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    providerPaymentId: b.providerPaymentId,
    refundReason: b.refundReason,
    refundedBy: b.refundedBy
      ? { fullName: b.refundedBy.fullName, email: b.refundedBy.email }
      : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

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
    private readonly paypal: PayPalService,
    private readonly payments: PaymentsService,
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
    const frontendUrl = this.config.getOrThrow<string>('app.frontendUrl');
    const totalSeats = booking.numAdults + booking.numChildren;

    // Dispatch on the chosen provider; both yield { providerSessionId, checkoutUrl }.
    // The outbound provider call is the only thing in the try — a failure leaves
    // the booking PENDING (retryable) and surfaces 502 CHECKOUT_FAILED.
    let providerSessionId: string;
    let checkoutUrl: string | null;
    try {
      if (booking.paymentProvider === PaymentProvider.STRIPE) {
        const session = await this.stripe.createCheckoutSession({
          bookingId: booking.id,
          bookingCode: booking.code,
          customerEmail: booking.contactEmail,
          currency: booking.currency.toLowerCase(),
          unitAmount: toStripeMinorUnits(booking.totalAmount, booking.currency),
          quantity: 1,
          productName: booking.tour.title,
          productDescription: `Booking ${booking.code} — ${totalSeats} seat(s)`,
          successUrl: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&code=${booking.code}`,
          cancelUrl: `${frontendUrl}/checkout/cancel?code=${booking.code}`,
        });
        providerSessionId = session.id;
        checkoutUrl = session.url;
      } else {
        const order = await this.paypal.createOrder({
          bookingId: booking.id,
          bookingCode: booking.code,
          currency: booking.currency.toUpperCase(),
          amount: toPayPalAmount(booking.totalAmount, booking.currency),
          returnUrl: `${frontendUrl}/checkout/success?code=${booking.code}`,
          cancelUrl: `${frontendUrl}/checkout/cancel?code=${booking.code}`,
        });
        providerSessionId = order.orderId;
        checkoutUrl = order.approveUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`Checkout failed for ${booking.code}: ${message}`);
      throw new BadGatewayException({
        code: 'CHECKOUT_FAILED',
        message: 'Could not start the payment session — please retry.',
      });
    }
    if (!checkoutUrl) {
      throw new BadGatewayException({
        code: 'CHECKOUT_FAILED',
        message: 'Payment provider returned no redirect URL.',
      });
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { providerSessionId },
    });
    this.logger.log(
      `Started ${booking.paymentProvider} checkout for ${booking.code} (ref=${providerSessionId})`,
    );
    return { checkoutUrl, bookingCode: booking.code, status: booking.status };
  }

  /**
   * Captures an approved PayPal order (called when the buyer returns from PayPal),
   * then reserves seats + marks PAID via the shared atomic claim. Owner-or-admin
   * (else 404). Idempotent: an already-PAID booking is returned as-is (the webhook
   * may have won the race). If seats sold out while the buyer was paying, the
   * capture is refunded and a 409 is raised.
   */
  async capturePayPal(code: string, caller: Caller): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        userId: true,
        paymentProvider: true,
        providerSessionId: true,
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
    if (booking.paymentProvider !== PaymentProvider.PAYPAL) {
      throw new BadRequestException({
        code: 'PROVIDER_MISMATCH',
        message: 'Capture is only valid for PayPal bookings',
      });
    }
    if (booking.status === BookingStatus.PAID) {
      return this.loadOwnedOr404(code, caller); // idempotent — already confirmed
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException({
        code: 'BOOKING_NOT_PENDING',
        message: `Booking is ${booking.status}; cannot capture`,
      });
    }
    if (!booking.providerSessionId) {
      throw new BadRequestException({
        code: 'NO_ORDER',
        message: 'No PayPal order to capture — start checkout first',
      });
    }

    const capture = await this.paypal.captureOrder(booking.providerSessionId);
    const outcome = await this.payments.claimSeatsForPaid(
      booking.id,
      capture.captureId ?? undefined,
    );

    if (outcome === 'overbooked') {
      // Won payment but lost the seat race — refund and surface a clear 409.
      if (capture.captureId) {
        await this.paypal.refundCapture(capture.captureId).catch((err: unknown) => {
          const m = err instanceof Error ? err.message : 'unknown';
          this.logger.error(`Auto-refund failed for ${booking.code}: ${m}`);
        });
      }
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.REFUNDED,
          cancelledAt: new Date(),
          providerPaymentId: capture.captureId,
        },
      });
      throw new ConflictException({
        code: 'SEATS_NOT_AVAILABLE',
        message: 'Seats sold out while paying — your payment was refunded.',
      });
    }

    this.logger.log(`Captured PayPal booking ${booking.code} (${outcome})`);
    return this.loadOwnedOr404(code, caller);
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
        paymentProvider: true,
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

    // Provider-specific refund FIRST (authoritative — never flip the DB for a
    // refund that didn't happen). Converge if the provider says it's already done.
    try {
      if (booking.paymentProvider === PaymentProvider.STRIPE) {
        await this.stripe.createRefund({
          paymentIntentId: booking.providerPaymentId,
          reason: args.reason ?? 'requested_by_customer',
        });
      } else {
        await this.paypal.refundCapture(booking.providerPaymentId);
      }
    } catch (err) {
      if (!this.isAlreadyRefundedError(err)) {
        const message = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Refund failed for ${booking.code}: ${message}`);
        throw new BadRequestException({
          code: 'REFUND_FAILED',
          message: `Provider refund failed: ${message}`,
        });
      }
      this.logger.warn(
        `Provider reports booking ${booking.code} already refunded — converging DB state`,
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
      ),
      refunded AS (
        UPDATE bookings
        SET status = 'REFUNDED'::"BookingStatus",
            cancelled_at = now(),
            refund_reason = ${args.reason ?? null},
            refunded_by = ${args.adminUserId}::uuid
        WHERE id = ${booking.id}::uuid AND status = 'PAID'::"BookingStatus"
        RETURNING id
      ),
      -- Atomic outbox enqueue (ADR-0007): only when the booking actually flipped
      -- to REFUNDED. Idempotent on retries via the dedupe_key UNIQUE.
      outbox_insert AS (
        INSERT INTO outbox (type, payload, dedupe_key)
        SELECT 'BOOKING_REFUNDED'::"EmailType",
               jsonb_build_object('bookingId', id),
               'booking-refunded:' || id::text
        FROM refunded
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id
      )
      SELECT id FROM refunded
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

  /**
   * Admin management list — paginated, newest first, optional `status` filter and
   * a case-insensitive `search` across code / contact email / contact name.
   */
  async findAllForAdmin(query: ListAdminBookingsQueryDto): Promise<PaginatedBookings> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tourId ? { tourId: query.tourId } : {}),
      ...(query.departureId ? { departureId: query.departureId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { contactEmail: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** One booking by code for an admin (sees any booking; no owner check). 404 if missing. */
  async findByCodeForAdmin(code: string): Promise<AdminBookingDetail> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: BOOKING_DETAIL_INCLUDE,
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${code}" not found`,
      });
    }

    // Side reads in parallel (Promise.all — pooler-safe, no batch $transaction).
    // PaymentEvent has no FK to Booking: link through the SAME payload paths the
    // webhook handlers route by (Stripe metadata.bookingId / PayPal custom_id).
    const othersWhere = { userId: booking.userId, id: { not: booking.id } };
    const [otherRows, otherTotal, eventRows] = await Promise.all([
      this.prisma.booking.findMany({
        where: othersWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          code: true,
          status: true,
          createdAt: true,
          totalAmount: true,
          currency: true,
          tour: { select: { title: true } },
        },
      }),
      this.prisma.booking.count({ where: othersWhere }),
      this.prisma.$queryRaw<PaymentEventRow[]>(Prisma.sql`
        SELECT id, provider, type, event_id AS "eventId",
               received_at AS "receivedAt", processed_at AS "processedAt"
        FROM payment_events
        WHERE (provider = 'STRIPE'
               AND payload->'data'->'object'->'metadata'->>'bookingId' = ${booking.id})
           OR (provider = 'PAYPAL'
               AND payload->'resource'->>'custom_id' = ${booking.id})
        ORDER BY received_at DESC
      `),
    ]);

    return {
      ...toAdminBookingDetail(booking),
      otherBookings: {
        total: otherTotal,
        items: otherRows.map((r) => ({
          code: r.code,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          tourTitle: r.tour.title,
          totalAmount: r.totalAmount.toString(),
          currency: r.currency,
        })),
      },
      paymentEvents: eventRows.map((e) => ({
        id: e.id,
        provider: e.provider,
        type: e.type,
        eventId: e.eventId,
        receivedAt: e.receivedAt.toISOString(),
        processedAt: e.processedAt ? e.processedAt.toISOString() : null,
      })),
    };
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
   * Detects a "money already back" provider error so the DB can converge to
   * REFUNDED: Stripe `charge_already_refunded` (on the error or its `raw`), or
   * PayPal `CAPTURE_FULLY_REFUNDED` (in the ApiError body/result).
   */
  private isAlreadyRefundedError(err: unknown): boolean {
    const code =
      (err as { code?: string })?.code ??
      (err as { raw?: { code?: string } })?.raw?.code;
    if (code === 'charge_already_refunded') return true;
    const raw =
      typeof (err as { body?: unknown })?.body === 'string'
        ? (err as { body: string }).body
        : JSON.stringify((err as { result?: unknown })?.result ?? '');
    return raw.includes('CAPTURE_FULLY_REFUNDED');
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
