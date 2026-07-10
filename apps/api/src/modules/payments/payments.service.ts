import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PayPalService } from './paypal.service';
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
    private readonly paypal: PayPalService,
    private readonly config: ConfigService,
  ) {}

  // ── Idempotency helpers (shared by both providers) ────────────────────────────

  /**
   * Records the event (`processedAt` NULL). Returns `true` to process, `false` to
   * skip a true duplicate. A `P2002` with `processedAt` already set = duplicate;
   * with NULL = a prior attempt crashed → re-run (handlers are idempotent).
   */
  private async beginEvent(
    provider: PaymentProvider,
    eventId: string,
    type: string,
    payload: unknown,
  ): Promise<boolean> {
    try {
      await this.prisma.paymentEvent.create({
        data: {
          provider,
          eventId,
          type,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (err) {
      if (!this.isUniqueConstraintError(err)) throw err;
      const existing = await this.prisma.paymentEvent.findUnique({
        where: { provider_eventId: { provider, eventId } },
        select: { processedAt: true },
      });
      if (existing?.processedAt) {
        this.logger.log(
          `Skipping duplicate ${provider} event ${eventId} (${type})`,
        );
        return false;
      }
      this.logger.warn(
        `Re-processing ${provider} event ${eventId} (${type}) — prior attempt never finished`,
      );
      return true;
    }
  }

  private async finishEvent(
    provider: PaymentProvider,
    eventId: string,
  ): Promise<void> {
    await this.prisma.paymentEvent.update({
      where: { provider_eventId: { provider, eventId } },
      data: { processedAt: new Date() },
    });
  }

  async handleStripeEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookAck> {
    const webhookSecret = this.config.getOrThrow<string>(
      'stripe.webhookSecret',
    );

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

    // 2. Idempotency — record first; skip a true duplicate (processedAt set).
    if (
      !(await this.beginEvent(
        PaymentProvider.STRIPE,
        event.id,
        event.type,
        event,
      ))
    ) {
      return { received: true, eventId: event.id, type: event.type };
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
    await this.finishEvent(PaymentProvider.STRIPE, event.id);
    return { received: true, eventId: event.id, type: event.type };
  }

  /**
   * PayPal webhook receiver. Verifies the signature (via the PayPal verify API),
   * then the same idempotency + atomic seat-claim as Stripe. Acts as the backstop
   * for the capture-on-return flow.
   */
  async handlePayPalEvent(
    headers: Record<string, string | undefined>,
    body: unknown,
  ): Promise<WebhookAck> {
    const event = (body ?? {}) as {
      id?: string;
      event_type?: string;
      resource?: { id?: string; custom_id?: string; status?: string };
    };
    if (!event.id || !event.event_type) {
      throw new BadRequestException({
        code: 'PAYPAL_WEBHOOK_INVALID',
        message: 'Malformed PayPal webhook payload',
      });
    }

    const verified = await this.paypal.verifyWebhookSignature(headers, body);
    if (!verified) {
      this.logger.warn(
        `Rejected PayPal webhook ${event.id} — signature invalid`,
      );
      throw new BadRequestException({
        code: 'PAYPAL_WEBHOOK_INVALID',
        message: 'Signature verification failed',
      });
    }

    if (
      !(await this.beginEvent(
        PaymentProvider.PAYPAL,
        event.id,
        event.event_type,
        event,
      ))
    ) {
      return { received: true, eventId: event.id, type: event.event_type };
    }

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      await this.onPayPalCaptureCompleted(event.resource);
    } else {
      this.logger.log(`Ignoring PayPal event type: ${event.event_type}`);
    }

    await this.finishEvent(PaymentProvider.PAYPAL, event.id);
    return { received: true, eventId: event.id, type: event.event_type };
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
    const outcome = await this.claimSeatsForPaid(bookingId, paymentIntentId);

    if (outcome === 'paid') {
      this.logger.log(
        `Booking ${bookingCode} confirmed PAID (payment_intent=${paymentIntentId ?? 'n/a'})`,
      );
      // The confirmation email was enqueued atomically in `claimSeatsForPaid`'s
      // CTE (an `outbox` row); the pg-boss worker delivers it (ADR-0007, P1.x).
    } else if (outcome === 'overbooked') {
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
   * Provider-agnostic atomic seat reservation (shared by the Stripe webhook, the
   * PayPal capture endpoint, and the PayPal webhook). One data-modifying CTE
   * claims seats **only if** they fit AND the booking is still PENDING, then flips
   * it to PAID with `providerPaymentId`. Pooler-safe (single statement, no
   * interactive `FOR UPDATE`); idempotent on retries (gated on PENDING).
   *
   * @returns `'paid'` (claimed + flipped) · `'overbooked'` (still PENDING but seats
   *   didn't fit — the caller issues a provider-specific refund) ·
   *   `'already_processed'` (a terminal-state booking — no-op).
   */
  async claimSeatsForPaid(
    bookingId: string,
    providerPaymentId: string | undefined,
  ): Promise<'paid' | 'overbooked' | 'already_processed'> {
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
      ),
      paid AS (
        UPDATE bookings
        SET status = 'PAID'::"BookingStatus",
            paid_at = now(),
            provider_payment_id = ${providerPaymentId ?? null}
        WHERE id = (SELECT booking_id FROM seat_claim)
        RETURNING id
      ),
      -- Atomic outbox enqueue (ADR-0007): only when the booking actually flipped
      -- to PAID. Idempotent on webhook retries via the dedupe_key UNIQUE.
      outbox_insert AS (
        INSERT INTO outbox (type, payload, dedupe_key)
        SELECT 'BOOKING_CONFIRMATION'::"EmailType",
               jsonb_build_object('bookingId', id),
               'booking-confirmation:' || id::text
        FROM paid
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id
      )
      SELECT id FROM paid
    `);
    if (claimed.length === 1) return 'paid';

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });
    return booking?.status === BookingStatus.PENDING
      ? 'overbooked'
      : 'already_processed';
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

  /**
   * PayPal capture webhook (backstop for capture-on-return). Reserves seats + PAID
   * via the shared claim; if the buyer lost the seat race, refund the capture and
   * mark REFUNDED. `custom_id` carries our `bookingId`; `id` is the capture id.
   */
  private async onPayPalCaptureCompleted(
    resource: { id?: string; custom_id?: string } | undefined,
  ): Promise<void> {
    const bookingId = resource?.custom_id;
    const captureId = resource?.id;
    if (!bookingId) {
      this.logger.warn(
        'PayPal capture webhook missing resource.custom_id — ignoring',
      );
      return;
    }
    const outcome = await this.claimSeatsForPaid(bookingId, captureId);
    if (outcome === 'paid') {
      this.logger.log(
        `PayPal capture ${captureId} confirmed booking ${bookingId} PAID`,
      );
    } else if (outcome === 'overbooked') {
      if (captureId) {
        await this.paypal.refundCapture(captureId).catch((err: unknown) => {
          const m = err instanceof Error ? err.message : 'unknown';
          this.logger.error(
            `Overbook auto-refund failed (capture ${captureId}): ${m}`,
          );
        });
      }
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.REFUNDED,
          cancelledAt: new Date(),
          providerPaymentId: captureId,
        },
      });
      this.logger.warn(`Auto-refunded overbooked PayPal booking ${bookingId}`);
    } else {
      this.logger.log(
        `PayPal booking ${bookingId} already terminal — skipping`,
      );
    }
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
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    );
  }
}
