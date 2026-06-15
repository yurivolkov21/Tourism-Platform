# Backend (apps/api)

NestJS service. Ports the donor's proven structure; hardened per
[ADR-0008](../decisions/0008-security-integrity-hardening.md).

> Skeleton — fill as modules land (P1).

## Module map

```text
common/   guards · interceptors (envelope) · filters · decorators · types
config/   Joi env validation + namespaced registerAs
          (app/supabase/stripe/momo/cloudinary/email/throttler/sentry)
prisma/   PrismaService (PrismaPg adapter) + prisma.config.ts (DIRECT_URL migrations)
jobs/     pg-boss: outbox (emails) + cron (abandoned-booking cleanup, media reconcile)  [NEW]
modules/  auth · users · destinations · tours(+itinerary) · departures · bookings ·
          payments (stripe + momo) · reviews · wishlist · media · uploads ·
          email · admin-stats · health · enquiry  [enquiry NEW]
```

## Payments (multi-gateway) — [ADR-0006](../decisions/0006-multi-gateway-momo.md)

- Shared core: create order → reserve-on-pay (`FOR UPDATE` on departure) →
  confirm booking → enqueue confirmation email (outbox).
- Per provider: **Stripe** (hosted Checkout + webhook, raw body + HMAC) ·
  **MoMo** (one-time payment + IPN, HMAC-SHA256). Each verifies signature,
  rejects → 400, logs to `PaymentEvent` (idempotent by `provider` + event id).
- Amount formatting via `toProviderAmount(amount, currency)` — handles
  zero-decimal currencies (VND) — see risk R1.

## Jobs / outbox — [ADR-0007](../decisions/0007-pgboss-outbox-jobs.md)

pg-boss on the same Postgres. Transactional outbox for emails (enqueue in the
booking-commit tx); cron for abandoned-booking cleanup + Cloudinary reconcile.
Handlers idempotent.

## Security ([ADR-0008](../decisions/0008-security-integrity-hardening.md))

RLS backstop · helmet + strict CORS + HSTS · webhook HMAC (Stripe+MoMo) ·
secrets via Joi fail-fast · zod/class-validator at boundaries · Sentry +
structured logs (no secret leakage) · rate-limit (Upstash if multi-instance).

## Request lifecycle

📝 *guard → interceptor → filter (envelope) diagram — fill in P1.2/P1.3.*

## Port checklist (from donor)

See [../../HANDOFF.md](../../HANDOFF.md) §"Donor code worth porting" for exact paths.
Envelope · SupabaseJwtGuard/RolesGuard · Stripe webhook idempotency · Joi env ·
PrismaPg adapter + pooler · Resend email · Cloudinary media.
