# API-W1 "Email revival" — implementation plan

**Spec:** `docs/06-specs/2026-07-13-api-w1-email-revival-design.md`
**Branch:** `feat/api-w1-email-revival` · **Scope:** apps/api + docs/email-templates

**STATUS: 🔨 IN PROGRESS** — started 2026-07-13.

Standing rules: TDD red→green on every renderer/dispatch/validation change ·
straight quotes · no unrelated-line reformatting · EN-only copy · design
tokens are the spec's hex table (email exception to the no-hex rule) ·
Conventional Commits · report → user confirms → commit/merge.

## Tasks

- [ ] T1 — Schema: `EmailType` + `NEWSLETTER_WELCOME` + migration
      (`prisma migrate dev --create-only` style file; deploy to prod at
      merge). Regenerate client.
- [ ] T2 — Config (TDD): `RESEND_REPLY_TO_EMAIL` optional + format ·
      `RESEND_FROM_EMAIL` format validation · `emailConfig.replyTo` ·
      `.env.example`.
- [ ] T3 — Shell (TDD): `escapeHtml` + `renderShell` helpers in
      `email.templates.ts` (header/monogram/hero/data-rows/button/footer
      slots per spec tokens); text-part helper stays.
- [ ] T4 — Renderers (TDD): re-skin the 4 existing + 3 new
      (cancellation-requested, cancellation-denied, newsletter-welcome);
      subjects per spec.
- [ ] T5 — email.service (TDD): replyTo on send · 3 new send methods.
- [ ] T6 — outbox.service (TDD): 3 new dispatch cases · booking-confirmation
      hydrate + tour slug/hero URL (buildCloudinaryUrl + cloudName config) ·
      refund hydrate + refundedAmount/status · CTA URLs from FRONTEND_URL.
- [ ] T7 — newsletter.service (TDD): tx enqueue with
      `newsletter-welcome:{email}` dedupe.
- [ ] T8 — docs/email-templates: rewrite 3 Supabase auth templates to v2 +
      README notes.
- [ ] T9 — Gate (`pnpm nx affected -t lint typecheck test build` +
      format:check, kill orphan node first) → adversarial review (strong
      tier — touches refund/money copy + SQL-adjacent hydrates) → fix →
      report → user confirms → commit → merge (rebase + ff-only) → prod
      `migrate deploy` → docs sweep (CHANGELOG entry · this STATUS ·
      functions-system S-JOB-1 · env runbook · HANDOFF/roadmap email lines).

Post-merge (with the user, dashboards): paste 3 Supabase templates ·
optional Supabase SMTP via Resend · set `RESEND_REPLY_TO_EMAIL` on Render.
