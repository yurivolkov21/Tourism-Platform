# Risks & mitigations

Carried over from the donor analysis (2026-06-15). Each risk has a mitigation
owner — most fold into [ADR-0007](../decisions/0007-pgboss-outbox-jobs.md)
(jobs/outbox) and [ADR-0008](../decisions/0008-security-integrity-hardening.md)
(security/integrity).

| # | Risk | Severity | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R1 | Stripe/PayPal **zero-decimal currency** (VND has no cents — ×100 is 100× wrong) | 🔴 High | `toStripeMinorUnits` / `toPayPalAmount` helpers + tests | ✅ done (P1.5b/c) |
| R2 | No **outbox/queue** — emails fire-and-forget, no retry; abandoned PENDING bookings not cleaned | 🟠 Med | pg-boss outbox + retries + cron cleanup (ADR-0007) | ✅ done (P1.x) |
| R3 | Authz **API-only, no RLS** — single layer | 🟠 Med | RLS enabled on all tables as backstop (ADR-0008) | ✅ done (P1.1) |
| R4 | **App-level integrity** (no FK on MediaAsset/refundedById) | 🟠 Med | `refundedById→User` FK (SetNull); MediaAsset polymorphic + reconcile job + tests | ✅ done (P1.1 + P1.x-b) |
| R5 | **Orphan Cloudinary** assets if DB write fails after upload | 🟡 Low | same-tx `MediaGarbage` recording + media-reconcile cron (pg-boss) | ✅ done (P1.x-b) |
| R6 | **In-memory rate-limit** ineffective across instances | 🟡 Low→Med | Upstash Redis store *if* multi-instance (ADR-0008) | deferred (single-instance) |
| R7 | Single-locale assumption baked into schema | 🟡 Low | EN-only now (ADR-0005); `@tourism/i18n` scaffold keeps door open | accepted |
| R8 | Enum `TourCategory` rigid (Lily may change categories) | 🟡 Low | `TourCategory` **lookup table** (not enum) — D-P1.5 | ✅ resolved (P1.1) |
| R9 | Prisma + Supavisor pooler prepared-statement edge cases under high concurrency | 🟡 Low | `PrismaPg` adapter handles most; `Promise.all` reads + atomic CTEs (no interactive tx on hot paths) | monitor |
