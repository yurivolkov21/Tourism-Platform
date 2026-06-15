# ADR-0007 — Background jobs + outbox via pg-boss (was D-P1.8)

**Status:** Accepted · **Date:** 2026-06-15

## Context

The donor has no queue: confirmation email is fire-and-forget (failure only
logged), no retries, no cleanup of abandoned bookings, no reconciliation of
orphaned Cloudinary assets. These are reliability gaps (risks R2, R5).

## Decision

Add **pg-boss** — a job queue that runs **on the existing Postgres** (no new
vendor / infra). Use it for:

- **Transactional outbox:** enqueue side-effects (emails) in the *same tx* that
  commits the booking → guaranteed at-least-once delivery + retries.
- **Scheduled jobs (cron):** expire/clean abandoned `PENDING` bookings;
  reconcile orphaned Cloudinary assets vs `MediaAsset` rows.
- **Retries with backoff** for transient provider failures (Resend, MoMo/Stripe).

## Consequences

- A `jobs` module in `apps/api`; handlers must be **idempotent**.
- Slightly more schema (pg-boss creates its own tables in a `pgboss` schema).
- Revisit a dedicated queue (Inngest/Trigger.dev) only if pg-boss limits bite.
