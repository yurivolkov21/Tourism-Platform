# Risks & mitigations

Carried over from the donor analysis (2026-06-15). Each risk has a mitigation
owner — most fold into [ADR-0007](../decisions/0007-pgboss-outbox-jobs.md)
(jobs/outbox) and [ADR-0008](../decisions/0008-security-integrity-hardening.md)
(security/integrity).

| # | Risk | Severity | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R1 | Stripe/MoMo **zero-decimal currency** (VND has no cents — ×100 is 100× wrong) | 🔴 High | `toProviderAmount(amount, currency)` helper in `@tourism/core` + tests (USD vs VND) | planned P1.5 |
| R2 | No **outbox/queue** — emails fire-and-forget, no retry; abandoned PENDING bookings not cleaned | 🟠 Med | pg-boss outbox + retries + cron cleanup (ADR-0007) | planned P1 |
| R3 | Authz **API-only, no RLS** — single layer | 🟠 Med | Enable RLS as backstop (ADR-0008) | planned P1.1+ |
| R4 | **App-level integrity** (no FK on MediaAsset/refundedById) | 🟠 Med | FK for refundedById (SetNull); MediaAsset polymorphic + reconcile job + tests (ADR-0008) | planned P1 |
| R5 | **Orphan Cloudinary** assets if DB write fails after upload | 🟡 Low | reconcile job (pg-boss) + same-tx cleanup | planned P1.6 |
| R6 | **In-memory rate-limit** ineffective across instances | 🟡 Low→Med | Upstash Redis store *if* multi-instance (ADR-0008) | deferred |
| R7 | Single-locale assumption baked into schema | 🟡 Low | EN-only now (ADR-0005); `@tourism/i18n` scaffold keeps door open | accepted |
| R8 | Enum `TourCategory` rigid (Lily may change categories) | 🟡 Low | revisit lookup-table vs enum (D-P1.5) | open |
| R9 | Prisma + Supavisor pooler prepared-statement edge cases under high concurrency | 🟡 Low | `PrismaPg` adapter handles most; monitor; keep tx short | monitor |
