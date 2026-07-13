# API-W3 "CRM/analytics" — implementation plan

**Spec:** `docs/06-specs/2026-07-13-api-w3-crm-analytics-design.md`
**Branch:** `feat/api-w3-crm-analytics` · **Scope:** apps/api · core regen ·
small admin/web touches

**STATUS: ✅ COMPLETE** — merged to `main` 2026-07-13 (`0547270`, ff-only);
migration `review_audit_and_tour_cost` applied to live Supabase. Review
(strong tier): 0 must-fix · 1 should-fix fixed + pinned (currency locked
once PAID bookings exist — margin bucketing) · nits addressed (optional
hasReview swagger · admin type cleanup · ReviewPrompt key). Self-caught
during build: public tour surfaces now STRIP `costPrice` (internal number).
api 499 · admin 266 · web 261. **Closes the API debt program W1→W2→W3.**

Standing rules: TDD red→green on service/renderer changes · straight
quotes · no unrelated-line reformatting · EN-only · Conventional Commits ·
report → user confirms → commit/merge → `migrate deploy` on live.

## Tasks

- [ ] T1 — Schema: `Review.moderatedById/moderatedAt` (+User relation) ·
      `Tour.costPrice` · 1 migration · prisma generate.
- [ ] T2 — Moderation audit (TDD): service writes audit on every moderate ·
      controller passes CurrentUser · admin DTO fields.
- [ ] T3 — hasReview (TDD): own-bookings hydrate + DTO flag.
- [ ] T4 — /reviews/mine (TDD): service + controller + DTO (cap 50).
- [ ] T5 — Margin (TDD): admin-stats cost/margin per currency (raw SQL) ·
      DTO fields + upper-bound note.
- [ ] T6 — Admin touches: tour form costPrice field · dashboard margin
      line · reviews detail moderated-by line. Web touch: review prompt
      consumes hasReview.
- [ ] T7 — `/regen-types` · gate (affected + format) · adversarial review
      (strong tier) → fix → report → user confirms → commit → ff-only
      merge → `migrate deploy` live → docs sweep (CHANGELOG · STATUS ·
      functions-catalog A-REV/dashboard rows · data-model.md · CLAUDE.md
      counts · HANDOFF/roadmap program line).
