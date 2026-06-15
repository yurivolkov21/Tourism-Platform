# ADR-0008 — Security & integrity hardening (tighter than donor)

**Status:** Accepted · **Date:** 2026-06-15

## Context

The donor's posture is solid on auth/webhooks but has single-layer choices:
authz only at the API layer (no RLS), app-level referential integrity (no FK on
`MediaAsset` / `refundedById`), in-memory rate-limiting, no error observability.
Goal for the rebuild: **optimal security + tighter integrity**.

## Decision

**Database integrity**

- **Real FKs where cheap:** `Booking.refundedById` → `User` with
  `onDelete: SetNull` (was a bare UUID snapshot).
- **MediaAsset** stays polymorphic (pragmatic, [decisions Q](README.md)) **but**
  gets a **reconcile/cleanup job** (pg-boss, [ADR-0007](0007-pgboss-outbox-jobs.md))
  - same-tx owner cleanup + tests covering orphan paths.
- **CHECK constraints** for all bounded values (rating 1..5, seats ≥ 0,
  `seatsBooked ≤ seatsTotal`, amounts ≥ 0).
- **Email uniqueness at the DB** via `citext` or a unique index on `lower(email)`
  (not app-side lowercasing only).

**Access control**

- **Enable RLS** on all tables as defense-in-depth (API uses the service role;
  RLS is the backstop if a direct path or key leak ever happens).
- Keep API-layer `SupabaseJwtGuard` + `RolesGuard` + `ADMIN_EMAILS` allowlist.
- **Least-privilege keys**: service-role key server-only; never shipped to FE.

**Surface hardening**

- **Webhook signature verification** for *both* Stripe (HMAC, raw body) and MoMo
  (HMAC-SHA256); reject → 400, never 500.
- **Secrets**: env + Joi fail-fast at boot; nothing hardcoded; rotate on exposure.
- **HTTP**: helmet security headers, strict CORS allowlist, HSTS.
- **Rate limiting**: per-route; move to a shared store (Upstash Redis) if/when
  multi-instance (in-memory is per-instance, see risk R6).
- **Input validation** at every boundary (zod in `@tourism/core` + class-validator
  DTOs); reject empty optional strings.

**Observability**

- **Sentry** (errors, esp. webhook/refund paths) + structured logging; never log
  secrets or full tokens.

## Consequences

- More setup up-front; production-grade security + integrity.
- RLS policies must be written alongside each table migration (P1.1+).
- Some choices are revisitable (Upstash only when multi-instance).
