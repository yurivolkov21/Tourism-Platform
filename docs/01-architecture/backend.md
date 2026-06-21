# Backend (apps/api)

NestJS service. Ports the donor's proven structure; hardened per
[ADR-0008](../02-decisions/0008-security-integrity-hardening.md).

> **Status: P1 complete** (P1.1 → P1.x + P1.7d/e). 187 unit + 8 e2e tests.
> Canonical surface: the running Swagger spec (`/api/docs`) + `schema.prisma`.

## Module map

```text
common/   guards (SupabaseJwt, Roles) · interceptors (envelope) · filters · decorators · slugify · types
config/   Joi env validation + namespaced registerAs
          (app/supabase/stripe/paypal/cloudinary/email/throttler/sentry)
prisma/   PrismaService (PrismaPg adapter) + prisma.config.ts (DIRECT_URL migrations)
modules/
  auth · users · destinations · tour-categories · tours · departures ·
  bookings · payments (stripe + paypal) · uploads · media ·
  reviews · wishlist · enquiry · admin-stats ·
  email (Resend templates) · jobs (pg-boss outbox + cron)
app/      AppModule (global guards/interceptor/filter) + root controller (GET /)
```

> No dedicated `/health` module — the root `GET /` is the only liveness touch-point.

## Payments (multi-gateway) — [ADR-0006](../02-decisions/0006-multi-gateway-momo.md) (Stripe + **PayPal**)

- **Two-step flow:** `POST /bookings` creates a `PENDING` booking (no payment); a
  separate `POST /bookings/:code/checkout` mints the provider session and returns
  `checkoutUrl`. Seats are **not** held at PENDING.
- **Stripe** — hosted Checkout + webhook (raw body + HMAC signature).
- **PayPal** — Orders v2, capture-on-return (`POST /bookings/:code/capture`) with the
  webhook as backstop; signature verified via PayPal's verify API.
- **Seat reservation is an atomic single-statement CTE** (`claimSeatsForPaid`): claim seats
  *only if* they fit AND the booking is still PENDING, then flip to PAID — **no interactive
  `$transaction`/`FOR UPDATE`** (the Supabase transaction pooler can't host those safely).
  The same CTE inserts the confirmation `Outbox` row (`ON CONFLICT (dedupe_key) DO NOTHING`).
- Both providers log to `PaymentEvent` (idempotent by `(provider, eventId)`; `processedAt`
  nullable → a mid-flight crash re-runs instead of being skipped forever).
- Amount formatting: `toStripeMinorUnits` / `toPayPalAmount` (handles zero-decimal currencies).

## Jobs / outbox — [ADR-0007](../02-decisions/0007-pgboss-outbox-jobs.md)

**pg-boss** on the same Postgres (`DIRECT_URL`; owns its `pgboss` schema; ESM →
dynamic-imported so it stays out of Jest; disabled in `test` / when `RESEND_API_KEY` absent):

- **Outbox drain** (cron 1m) — `OutboxService.drainOutbox` sends PENDING `outbox` rows via
  Resend (`EmailService`), retries to a cap then parks `FAILED`. Rows are written atomically
  with their state change (PAID/refund in a CTE; review-approved/enquiry in a short tx).
- **Abandoned-booking cleanup** (cron 15m) — stale `PENDING` → `CANCELLED`.
- **Media reconcile** (cron daily) — destroys orphaned Cloudinary assets recorded in
  `MediaGarbage` (`CloudinaryService.destroy`).

## Security ([ADR-0008](../02-decisions/0008-security-integrity-hardening.md))

RLS backstop · helmet + strict CORS + HSTS · webhook signature verify (Stripe HMAC +
PayPal verify API) · secrets via Joi fail-fast · class-validator at boundaries · Sentry +
structured logs (no secret leakage) · per-controller rate-limit (`@nestjs/throttler`) +
enquiry honeypot.

## Request lifecycle

`SupabaseJwtGuard` (verify JWT, attach `req.currentUser`) → `RolesGuard` (`@Roles`/`@Public`)
→ controller → `TransformInterceptor` (wrap success as `{ data, error: null, meta? }`) /
`HttpExceptionFilter` (failure → `{ data: null, error }`). Guards + interceptor + filter are
global `APP_*` providers in `AppModule`. `@SkipTransform` opts webhooks out of the envelope.

## Feature coverage (P1)

CRUD: destinations · tours (+categories, M:N destinations, itinerary/FAQs/policies, media) ·
departures · **bookings + Stripe/PayPal** · **media** (Cloudinary signed upload) · **reviews**
(PAID-gated + moderation) · **wishlist** · **enquiry** (throttle + honeypot + lead fields) ·
**admin-stats** · **jobs** (outbox + cron). Function catalog:
[../03-reference/functions-admin.md](../03-reference/functions-admin.md) ·
[functions-customer.md](../03-reference/functions-customer.md) ·
[functions-system.md](../03-reference/functions-system.md).
