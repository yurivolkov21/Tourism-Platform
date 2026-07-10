import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  PaypalExperienceUserAction,
} from '@paypal/paypal-server-sdk';

/** Result of creating a PayPal order — the FE redirects to `approveUrl`. */
export interface PayPalOrderResult {
  orderId: string;
  approveUrl: string | null;
}

/** Result of capturing an order — `captureId` is persisted as `providerPaymentId`. */
export interface PayPalCaptureResult {
  captureId: string | null;
  status: string | null;
}

/** Result of a PayPal refund. */
export interface PayPalRefundResult {
  id: string;
  status: string | null;
}

/** Minimal shape we read off an order's capture for id/status extraction. */
interface OrderLike {
  id?: string;
  links?: { href: string; rel: string }[];
  purchaseUnits?: {
    payments?: { captures?: { id?: string; status?: string }[] };
  }[];
}

/**
 * Thin wrapper over `@paypal/paypal-server-sdk` (Orders v2) returning small domain
 * shapes — no SDK types leak across the module boundary (mirrors `StripeService`).
 *
 * Flow (capture-on-return + webhook backstop):
 *  - `createOrder` (intent CAPTURE) → returns the approve link.
 *  - `captureOrder` after the buyer approves → returns the capture id.
 *  - `refundCapture` for admin refunds.
 *  - `verifyWebhookSignature` via the v1 verify-webhook-signature REST endpoint
 *    (the SDK doesn't wrap it) using a cached OAuth token. No raw body needed —
 *    PayPal verifies the parsed event + transmission headers.
 */
@Injectable()
export class PayPalService implements OnModuleInit {
  private readonly logger = new Logger(PayPalService.name);
  private orders!: OrdersController;
  private payments!: PaymentsController;
  private clientId!: string;
  private clientSecret!: string;
  private webhookId!: string;
  private baseUrl!: string;
  private cachedToken?: { token: string; expiresAt: number };

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.clientId = this.config.getOrThrow<string>('paypal.clientId');
    this.clientSecret = this.config.getOrThrow<string>('paypal.clientSecret');
    this.webhookId = this.config.get<string>('paypal.webhookId') ?? '';
    const mode = this.config.get<string>('paypal.mode') ?? 'sandbox';
    const isLive = mode === 'live';
    this.baseUrl = isLive
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.clientId,
        oAuthClientSecret: this.clientSecret,
      },
      environment: isLive ? Environment.Production : Environment.Sandbox,
    });
    this.orders = new OrdersController(client);
    this.payments = new PaymentsController(client);
  }

  /** Creates a CAPTURE-intent order; returns the order id + approve link. */
  async createOrder(args: {
    bookingId: string;
    bookingCode: string;
    currency: string;
    amount: string;
    returnUrl: string;
    cancelUrl: string;
    brandName?: string;
  }): Promise<PayPalOrderResult> {
    const { result } = await this.orders.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            referenceId: args.bookingCode,
            customId: args.bookingId,
            description: `Booking ${args.bookingCode}`,
            amount: { currencyCode: args.currency, value: args.amount },
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              brandName: args.brandName ?? 'Tourism',
              userAction: PaypalExperienceUserAction.PayNow,
              returnUrl: args.returnUrl,
              cancelUrl: args.cancelUrl,
            },
          },
        },
      },
      prefer: 'return=representation',
    });
    const order = result as OrderLike;
    const approveUrl =
      order.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')
        ?.href ?? null;
    this.logger.log(
      `Created PayPal order ${order.id} for booking ${args.bookingCode}`,
    );
    return { orderId: order.id ?? '', approveUrl };
  }

  /**
   * Captures an approved order. `ORDER_ALREADY_CAPTURED` is treated as success —
   * re-read the order to return the existing capture (idempotent on retries).
   */
  async captureOrder(orderId: string): Promise<PayPalCaptureResult> {
    try {
      const { result } = await this.orders.captureOrder({
        id: orderId,
        prefer: 'return=representation',
      });
      return this.extractCapture(result as OrderLike);
    } catch (err) {
      if (!this.isAlreadyCaptured(err)) throw err;
      this.logger.warn(
        `Order ${orderId} already captured — reading existing capture`,
      );
      const { result } = await this.orders.getOrder({ id: orderId });
      return this.extractCapture(result as OrderLike);
    }
  }

  /**
   * Refunds a captured payment — full, or a partial `amount` when provided.
   * `requestId` (deterministic, e.g. `booking-refund:<bookingId>`) maps to the
   * `PayPal-Request-Id` idempotency header via the SDK's `paypalRequestId`, so
   * two concurrent refund attempts for the same booking can't double-charge.
   */
  async refundCapture(
    captureId: string,
    amount?: { value: string; currencyCode: string },
    requestId?: string,
  ): Promise<PayPalRefundResult> {
    const { result } = await this.payments.refundCapturedPayment({
      captureId,
      ...(requestId ? { paypalRequestId: requestId } : {}),
      body: amount
        ? { amount: { value: amount.value, currencyCode: amount.currencyCode } }
        : undefined,
    });
    this.logger.log(
      `Refunded PayPal capture ${captureId} (status=${result.status})`,
    );
    return { id: result.id ?? '', status: result.status ?? null };
  }

  /**
   * Verifies a webhook via PayPal's `verify-webhook-signature` endpoint. Needs the
   * configured `PAYPAL_WEBHOOK_ID` (false if unset). Returns true only on `SUCCESS`.
   */
  async verifyWebhookSignature(
    headers: Record<string, string | undefined>,
    event: unknown,
  ): Promise<boolean> {
    if (!this.webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID not configured — rejecting webhook');
      return false;
    }
    const token = await this.getAccessToken();
    const payload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: this.webhookId,
      webhook_event: event,
    };
    const resp = await fetch(
      `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );
    if (!resp.ok) {
      this.logger.warn(`verify-webhook-signature returned HTTP ${resp.status}`);
      return false;
    }
    const json = (await resp.json()) as { verification_status?: string };
    return json.verification_status === 'SUCCESS';
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  /** OAuth client-credentials token, cached until ~1 min before expiry. */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.token;
    }
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );
    const resp = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${basic}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!resp.ok) {
      throw new Error(`PayPal OAuth token request failed: HTTP ${resp.status}`);
    }
    const json = (await resp.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.cachedToken = {
      token: json.access_token,
      expiresAt: now + json.expires_in * 1000,
    };
    return json.access_token;
  }

  private extractCapture(order: OrderLike): PayPalCaptureResult {
    const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];
    return { captureId: capture?.id ?? null, status: capture?.status ?? null };
  }

  /** PayPal returns 422 `ORDER_ALREADY_CAPTURED` on a double-capture. */
  private isAlreadyCaptured(err: unknown): boolean {
    const raw =
      typeof (err as { body?: unknown })?.body === 'string'
        ? (err as { body: string }).body
        : JSON.stringify((err as { result?: unknown })?.result ?? {});
    return raw.includes('ORDER_ALREADY_CAPTURED');
  }
}
