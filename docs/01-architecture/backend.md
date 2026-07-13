# Backend (apps/api)

NestJS service. Ports the donor's proven structure; hardened per
[ADR-0008](../02-decisions/0008-security-integrity-hardening.md).

> **Status: P1 + blog-v2 BE + API debt program W1→W3 (2026-07-13) complete.**
> **105 endpoints / 20 modules · 499 unit + 8 e2e tests.** Canonical surface: the
> running Swagger spec (`/api/docs`) + `schema.prisma`.
> Debt-program deltas: all **7 EmailTypes** dispatch w/ branded v2 templates +
> Reply-To (W1) · cancel-departure **auto-refund** + unpublish guard
> `TOUR_HAS_ACTIVE_BOOKINGS` + orphaned-capture refund (`claimSeatsForPaid`
> outcome `cancelled`) + PayPal client id/secret required at boot + throttle env
> enforced (W2) · review moderation audit (`moderatedBy/At`) · `GET
> /reviews/mine` · `BookingDto.hasReview` · `Tour.costPrice` (admin-only,
> stripped from public reads) + per-currency dashboard margin + currency lock
> `TOUR_CURRENCY_LOCKED` (W3). Details: [CHANGELOG](../CHANGELOG.md).

## Module map

```text
common/   guards (SupabaseJwt, Roles) · interceptors (envelope) · filters · decorators · slugify · types
config/   Joi env validation + namespaced registerAs
          (app/supabase/stripe/paypal/cloudinary/email/throttler/sentry)
prisma/   PrismaService (PrismaPg adapter) + prisma.config.ts (DIRECT_URL migrations)
modules/
  auth · users · destinations · tour-categories · tours · departures ·
  bookings · cancellations (cancellation-request queue) · payments (stripe + paypal) ·
  uploads · media · site-media (brand-chrome slots) ·
  reviews · wishlist · enquiry · newsletter · admin-stats · posts ·
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
  (Nuance, wave D2: the pooler ban is on **interactive** lock-holding across statements — a
  `FOR UPDATE` inside ONE autocommit statement is fine. The last-admin demote guard
  (`admin-users` `changeRole`) uses exactly that: a locking-CTE locks all ADMIN rows and
  counts them in the same statement, so concurrent demotes can never zero out the admin
  pool; `deleteUser` pairs it with a role-conditional `deleteMany`.)
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
  `MediaGarbage` (`CloudinaryService.destroy`). **Ref-safe GC (wave D1, 2026-07-11)** — since the
  reuse picker lets one publicId serve several owners, the enqueue side skips a publicId still
  referenced by any owner, and this cron re-checks at destroy time as a backstop before calling
  Cloudinary, so a legitimately re-attached image is never destroyed out from under its new owner.

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
**admin-stats** (optional `?from&to` range + per-currency aggregation, no FX — wave D2) ·
**jobs** (outbox + cron) · **cancellation-request queue** (customer
`POST /bookings/:code/cancellation-request` on a PAID booking + admin
`GET /admin/cancellation-requests` list / `POST /admin/cancellation-requests/:id/deny`) ·
**site-media / Appearance** (public `GET /site-media` + admin `GET/PUT /admin/site-media/:key/media`
for the 9 brand-chrome slots) · **enquiry CRM** (`EnquiryNote` internal-notes thread +
per-page repeat-lead counts on the admin enquiry list) · **subscriber + outbox deletes**
(`DELETE /admin/newsletter/subscribers/:id`, `DELETE /admin/outbox/:id` — atomic vs the drain
cron, 409 if already `SENT`) · **`GET /admin/payment-events`** (webhook log viewer with raw
payload + best-effort booking link). Function catalog:
[../03-reference/functions-admin.md](../03-reference/functions-admin.md) ·
[functions-customer.md](../03-reference/functions-customer.md) ·
[functions-system.md](../03-reference/functions-system.md).
