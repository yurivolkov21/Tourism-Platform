import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/** Minimal Checkout result the booking flow needs (insulates callers from the SDK). */
export interface CheckoutSessionResult {
  id: string;
  url: string | null;
}

/** Verified webhook event, narrowed to what `PaymentsService` dispatches on. */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

/** Minimal refund result (id + Stripe status). */
export interface RefundResult {
  id: string;
  status: string | null;
}

/**
 * Stripe v22 SDK note: the default export is the callable `StripeConstructor`;
 * the client instance type is `Stripe.Stripe`, and the rich resource types are
 * awkward to name through the default export. We follow the SDK's own guidance
 * and **let TS infer** method return types from the client calls rather than
 * annotating the deep `Checkout.Session` / `Event` / `Refund` paths.
 *
 * Thin wrapper so the rest of the codebase never touches the raw constructor:
 * keeps key/version wiring in one place and makes the SDK trivially mockable
 * (services depend on `StripeService`, not `Stripe`). Construction is deferred to
 * `onModuleInit` so the config namespace is validated first and tests that don't
 * load `PaymentsModule` never side-effect on the env.
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  private stripe!: Stripe.Stripe;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const secretKey = this.config.getOrThrow<string>('stripe.secretKey');
    // No explicit `apiVersion`: the installed SDK pins its own default. Lock it
    // when hardening for prod so the event schema can't drift under us.
    this.stripe = new Stripe(secretKey, { typescript: true });
  }

  /** Raw client for advanced callers (none today — prefer the named methods). */
  get client(): Stripe.Stripe {
    return this.stripe;
  }

  /**
   * Creates a hosted Checkout Session for a booking. Hosted Checkout keeps PCI
   * scope off our backend (Stripe collects the card) and gives 3DS + wallets for
   * free. `metadata` is the authoritative bridge to the webhook — `bookingId` /
   * `bookingCode` survive into `checkout.session.completed`.
   *
   * @param args.unitAmount already in the smallest currency unit (see `money.ts`).
   */
  async createCheckoutSession(args: {
    bookingId: string;
    bookingCode: string;
    customerEmail: string;
    currency: string;
    unitAmount: number;
    quantity: number;
    productName: string;
    productDescription?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: args.customerEmail,
      line_items: [
        {
          quantity: args.quantity,
          price_data: {
            currency: args.currency,
            unit_amount: args.unitAmount,
            product_data: {
              name: args.productName,
              description: args.productDescription,
            },
          },
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        bookingId: args.bookingId,
        bookingCode: args.bookingCode,
      },
      // 30-min expiry — explicit so abandoned sessions fire
      // `checkout.session.expired` and the booking is auto-cancelled.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    this.logger.log(
      `Created Stripe Checkout session ${session.id} for booking ${args.bookingCode}`,
    );
    return { id: session.id, url: session.url };
  }

  /**
   * Verifies a webhook payload's signature against the **raw** bytes and returns
   * the parsed Event. JSON-parsing before verification corrupts the signature —
   * `express.raw()` is mounted on the webhook path in `main.ts` for this reason.
   * Throws on a malformed header or secret mismatch; the caller maps that to 400
   * (never 500 — Stripe would retry forever).
   */
  constructEvent(
    rawBody: Buffer | string,
    signature: string,
    webhookSecret: string,
  ): StripeWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
    return {
      id: event.id,
      type: event.type,
      data: { object: event.data.object },
    };
  }

  /**
   * Issues a full or partial refund against a Payment Intent (the canonical
   * handle once a session completes). Stripe's `reason` is a closed enum —
   * forward only documented values, else stash the free-form reason in metadata.
   */
  async createRefund(args: {
    paymentIntentId: string;
    reason?: string;
    amountMinorUnits?: number;
    idempotencyKey?: string;
  }): Promise<RefundResult> {
    const reasonField =
      args.reason && isDocumentedRefundReason(args.reason)
        ? { reason: args.reason }
        : { metadata: { internal_reason: args.reason ?? '' } };

    const refund = await this.stripe.refunds.create(
      {
        payment_intent: args.paymentIntentId,
        ...(args.amountMinorUnits !== undefined
          ? { amount: args.amountMinorUnits }
          : {}),
        ...reasonField,
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
    this.logger.log(
      `Issued refund ${refund.id} for payment_intent ${args.paymentIntentId} (status=${refund.status})`,
    );
    return { id: refund.id, status: refund.status };
  }
}

/** Stripe's accepted `reason` values for a refund (closed enum). */
type DocumentedRefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer';

function isDocumentedRefundReason(
  reason: string,
): reason is DocumentedRefundReason {
  return (
    reason === 'duplicate' ||
    reason === 'fraudulent' ||
    reason === 'requested_by_customer'
  );
}
