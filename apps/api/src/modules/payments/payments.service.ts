import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService, StripeWebhookEvent } from './stripe.service';

/** Minimal shape we read off a `checkout.session.*` event object. */
interface CheckoutSessionLike {
  id: string;
  metadata?: { bookingId?: string; bookingCode?: string } | null;
  payment_intent?: string | { id: string } | null;
}

/** Result of `handleStripeEvent`, echoed in the (Stripe-ignored) ack body. */
interface WebhookAck {
  received: true;
  eventId: string;
  type: string;
}

/**
 * Stripe webhook brain — the back half of the booking lifecycle (everything
 * after the buyer leaves Checkout). Provider-neutral persistence: events log to
 * `PaymentEvent` keyed by `(provider, eventId)`; bookings carry `providerPaymentId`.
 *
 * Two idempotency layers:
 *  1. **Event-level** — `PaymentEvent` unique on `(provider, eventId)`. A `P2002`
 *     with `processedAt` set means a true duplicate (return 200, no side effects);
 *     a `processedAt` NULL means a prior attempt crashed mid-flight, so re-run
 *     (booking-level idempotency makes that safe).
 *  2. **Booking-level** — the seat reservation is a single atomic SQL statement
 *     gated on `status = 'PENDING'`, so replays never double-count seats.
 *
 * Seat reservation is pooler-safe: a data-modifying CTE (claim seats only if they
 * fit AND the booking is still PENDING, then flip to PAID) runs as ONE statement —
 * no interactive `$transaction` / `FOR UPDATE`, which the Supabase transaction
 * pooler (connection-per-statement) would break.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  async handleStripeEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookAck> {
    const webhookSecret = this.config.getOrThrow<string>('stripe.webhookSecret');

    // 1. Verify signature over the RAW bytes.
    let event: StripeWebhookEvent;
    try {
      event = this.stripe.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`Rejected webhook (signature invalid): ${message}`);
      throw new BadRequestException({
        code: 'STRIPE_WEBHOOK_INVALID',
        message: `Signature verification failed: ${message}`,
      });
    }

    // 2. Idempotency — insert first (processedAt NULL until the handler finishes).
    try {
      await this.prisma.paymentEvent.create({
        data: {
          provider: PaymentProvider.STRIPE,
          eventId: event.id,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (!this.isUniqueConstraintError(err)) throw err;
      const existing = await this.prisma.paymentEvent.findUnique({
        where: {
          provider_eventId: {
            provider: PaymentProvider.STRIPE,
            eventId: event.id,
          },
        },
        select: { processedAt: true },
      });
      if (existing?.processedAt) {
        this.logger.log(
          `Skipping duplicate Stripe event ${event.id} (${event.type}) — already processed`,
        );
        return { received: true, eventId: event.id, type: event.type };
      }
      this.logger.warn(
        `Re-processing Stripe event ${event.id} (${event.type}) — prior attempt never finished`,
      );
    }

    // 3. Dispatch.
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event);
        break;
      case 'checkout.session.expired':
        await this.onCheckoutExpired(event);
        break;
      default:
        this.logger.log(`Ignoring unhandled Stripe event type: ${event.type}`);
    }

    // 4. Mark done — further retries of this id become pure no-ops.
    await this.prisma.paymentEvent.update({
      where: {
        provider_eventId: {
          provider: PaymentProvider.STRIPE,
          eventId: event.id,
        },
      },
      data: { processedAt: new Date() },
    });

    return { received: true, eventId: event.id, type: event.type };
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  /**
   * Payment confirmed. Atomically claim seats + flip the booking to PAID in one
   * statement. If the claim returns no row, the booking is either already
   * processed (no-op) or lost a seat race while the buyer was on Checkout
   * (overbooked → auto-refund). The refund (an outbound Stripe call) runs OUTSIDE
   * any DB write so it never holds a pooler connection.
   */
  private async onCheckoutCompleted(event: StripeWebhookEvent): Promise<void> {
    const session = event.data.object as CheckoutSessionLike;
    const bookingId = session.metadata?.bookingId;
    const bookingCode = session.metadata?.bookingCode ?? '<unknown>';
    if (!bookingId) {
      this.logger.warn(
        `checkout.session.completed ${session.id} missing metadata.bookingId — ignoring`,
      );
      return;
    }
    const paymentIntentId = this.extractPaymentIntentId(session);

    const claimed = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH booking_check AS (
        SELECT id, departure_id, (num_adults + num_children) AS seats
        FROM bookings
        WHERE id = ${bookingId}::uuid AND status = 'PENDING'::"BookingStatus"
      ),
      seat_claim AS (
        UPDATE tour_departures d
        SET seats_booked = d.seats_booked + bc.seats
        FROM booking_check bc
        WHERE d.id = bc.departure_id AND d.seats_booked + bc.seats <= d.seats_total
        RETURNING bc.id AS booking_id
      )
      UPDATE bookings
      SET status = 'PAID'::"BookingStatus",
          paid_at = now(),
          provider_payment_id = ${paymentIntentId ?? null}
      WHERE id = (SELECT booking_id FROM seat_claim)
      RETURNING id
    `);

    if (claimed.length === 1) {
      this.logger.log(
        `Booking ${bookingCode} confirmed PAID (payment_intent=${paymentIntentId ?? 'n/a'})`,
      );
      // Confirmation email is deferred to the pg-boss outbox (ADR-0007, P1.x).
      return;
    }

    // No row claimed: distinguish "already processed" from "lost the seat race".
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });
    if (booking?.status === BookingStatus.PENDING) {
      await this.refundOverbookedAndCancel({
        bookingId,
        bookingCode,
        paymentIntentId,
      });
    } else {
      this.logger.log(
        `Booking ${bookingCode} already in a terminal state — skipping`,
      );
    }
  }

  /**
   * Session expired (no payment within 30 min) → mark CANCELLED. No seats were
   * held at PENDING, so nothing to release.
   */
  private async onCheckoutExpired(event: StripeWebhookEvent): Promise<void> {
    const session = event.data.object as CheckoutSessionLike;
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { code: true, status: true },
    });
    if (!booking || booking.status !== BookingStatus.PENDING) return;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
    this.logger.log(
      `Booking ${booking.code} expired (Stripe session ${session.id}) — marked CANCELLED`,
    );
  }

  // ── Internals ─────────────────────────────────────────────────────────────────

  /**
   * Auto-refund a booking that won payment but lost the seat race. Stripe call
   * first; only flip to REFUNDED if the money is provably back. A failed refund
   * leaves the booking PENDING for an operator to resolve (visible as stale).
   */
  private async refundOverbookedAndCancel(args: {
    bookingId: string;
    bookingCode: string;
    paymentIntentId: string | undefined;
  }): Promise<void> {
    if (!args.paymentIntentId) {
      this.logger.error(
        `Cannot auto-refund overbooked booking ${args.bookingCode} — payment_intent missing`,
      );
      return;
    }
    try {
      await this.stripe.createRefund({
        paymentIntentId: args.paymentIntentId,
        reason: 'requested_by_customer',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.logger.error(
        `Refund failed for overbooked booking ${args.bookingCode}: ${message}`,
      );
      return;
    }
    await this.prisma.booking.update({
      where: { id: args.bookingId },
      data: {
        status: BookingStatus.REFUNDED,
        cancelledAt: new Date(),
        providerPaymentId: args.paymentIntentId,
      },
    });
    this.logger.warn(
      `Auto-refunded overbooked booking ${args.bookingCode} (payment_intent=${args.paymentIntentId})`,
    );
  }

  /** Stripe's session `payment_intent` is an id string or expanded object. */
  private extractPaymentIntentId(
    session: CheckoutSessionLike,
  ): string | undefined {
    const pi = session.payment_intent;
    if (!pi) return undefined;
    return typeof pi === 'string' ? pi : pi.id;
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
    );
  }
}
