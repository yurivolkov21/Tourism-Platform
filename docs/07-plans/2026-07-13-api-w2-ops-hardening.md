# API-W2 "Ops hardening" — implementation plan

**Spec:** `docs/06-specs/2026-07-13-api-w2-ops-hardening-design.md`
**Branch:** `feat/api-w2-ops-hardening` · **Scope:** apps/api · @tourism/core
regen · minimal admin toast

**STATUS: 🔨 IN PROGRESS** — started 2026-07-13.

Standing rules: TDD red→green on every service/validation/renderer change ·
straight quotes · no unrelated-line reformatting · EN-only copy ·
Conventional Commits · report → user confirms → commit/merge.

## Tasks

- [ ] T1 — env.validation (TDD): PayPal trio `.required()` non-empty;
      fixture update.
- [ ] T2 — Throttler wiring (TDD where testable): `forRootAsync` on
      newsletter + enquiry modules reading `throttler.*` config;
      `.env.example` comments.
- [ ] T3 — Refund email Reason row (TDD): `BookingRefundedVars.reason?` +
      renderer row + outbox hydrate `refundReason`.
- [ ] T4 — Unpublish guard (TDD): `TOUR_HAS_ACTIVE_BOOKINGS` 409 in
      `ToursService.update`.
- [ ] T5 — Cancel-departure flow (TDD): transition detection · PENDING
      flip · sequential `refundByAdmin` loop with summary · idempotency ·
      `DeparturesModule` imports `BookingsModule` · response DTO
      `cancellation?`.
- [ ] T6 — `/regen-types` (boot built API locally → regenerate
      `@tourism/core` schema) + admin: summary toast on the departure form
      when `cancellation` present.
- [ ] T7 — Gate (affected lint/typecheck/test/build + format, kill orphan
      node first) → adversarial review (strong tier — money-path loop) →
      fix → report → user confirms → commit → ff-only merge → docs sweep
      (CHANGELOG · this STATUS · functions-catalog rows for A-DEP-3/A-TUR-4
      · roadmap/HANDOFF debt lines).
