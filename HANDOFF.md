# HANDOFF — tourism-platform (resume here)

**Read this first when opening a new session.** Founding plan:
[`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) · full history (one entry per merge):
[`docs/CHANGELOG.md`](docs/CHANGELOG.md) · phase status:
[`docs/roadmap.md`](docs/roadmap.md) · design study:
[`docs/03-reference/reference-sites-analysis.md`](docs/03-reference/reference-sites-analysis.md).

## What this is

A **greenfield rebuild** of a tourism booking platform, styled after
**<https://lilystravelagency.com/>** (primary design reference) + Nom Nom Travel.
Nx + pnpm monorepo with **mobile from day one**.

- **This repo** (`c:\Dev Program Files\Dev\Projects\Tourism-Platform`) = the new,
  active project.
- **Donor repo** (`tourism-be-api`) = the previous build, **FROZEN reference** —
  read it to port proven code, never modify it.

## Why we rebuilt (Yuri's intent)

Clean, deliberately-designed **data model** (past decisions felt hasty), tighter
data control, add **mobile**, and a coherent Lily-style FE (no "thập cẩm"
patching). Strategy: greenfield + donor as a safety net to port from. Keep our
**self-serve online booking** (Stripe/PayPal) — the edge Lily lacks (they close
via chat).

## Locked decisions

| Area | Choice |
| --- | --- |
| Monorepo | **Nx 22 + pnpm** |
| Mobile | **Expo / React Native** (max code reuse with web via shared libs) |
| Backend | **NestJS** — *fresh clean Prisma schema* + **PORT** donor's proven infra |
| Web / Admin | **Next.js 16** App Router, Lily-style |
| Data model | multi-destination **M:N**, lightweight **Enquiry** ("Inquire Now"), + highlights / FAQ / policies / price-anchor (`compareAtPrice`) |
| i18n | **English-only** (ADR-0005; was EN/VI) |
| Direction | Lily-adapted (warm, trust-forward); brand **"Nexora"**, palette **"Emerald Heritage"** |

## Current state (2026-07-12)

**Every product phase is complete and deployed.** The admin owed-features debt
program (waves B1 → B2 → C → D1 → D2) closed 2026-07-12. Wave-by-wave detail:
[CHANGELOG](docs/CHANGELOG.md).

- **API (P1+)** — live on **Render** (`/health` + cron-job.org keep-alive).
  Full surface: 104 endpoints across 20 modules (CRUD · bookings ·
  Stripe/PayPal + refunds · cancellation queue · media w/ ref-safe GC ·
  reviews/CRM · newsletter · site-media · dashboard stats w/ `?from&to` +
  per-currency · pg-boss outbox/cron). **439 unit + 8 e2e tests.**
- **Design system (P2)** — `@tourism/tokens` (no-hex enforced) +
  `@tourism/ui` (54 shadcn/Base UI comps) + `@tourism/mobile-ui` (RN, 34 tests).
- **Web (P3 + P6)** — live on **Vercel**. Marketing + catalogue + booking
  money-path + account + blog (v2 complete) on real data; a11y/SEO/perf polish
  done; brand chrome admin-managed via site-media; resilience layer (loading
  skeletons · error/404/global-error boundaries · empty-vs-failed) → W4 ✅ (shared AuthFormField · noValidate completion · auth titles i18n) — **PROGRAM CLOSED 2026-07-12**. **261 tests.**
- **Admin (P4)** — live on **Vercel** (dev :3002). Full CRUD + operations
  (bookings/refunds · cancellation queue · reviews/CRM · enquiries+notes ·
  subscribers · outbox · payment-events) + media library (reuse picker · alt ·
  bulk delete; avatars hidden by default) + Appearance + dashboard
  (date-range + per-currency) + motion layer. **264 tests.**
- **Mobile (P5 + P5.5)** — feature-complete (5 tabs · browse/detail · stepped
  booking money-path · guest-first auth · wishlist · Trips). Expo Go dev loop
  only (no store builds). **153 tests.**

Baselines: **api 439 · web 261 · admin 264 · mobile 153 · mobile-ui 34 · core 42.**

## Next actions

1. ⚠️ **Combined mobile on-device pass** (Expo Go, Android): N3 five-tab IA +
   Home states · N2 sheets + stepped booking · N1 feel checklist · W4 payment
   loop (Stripe test card · PayPal sandbox · abandon→Pay now ·
   cancel/cancellation-request · guest gating).
2. **User visual pass on deployed surfaces** — in progress (the 2026-07-12
   avatar fix came out of it); remaining admin surfaces: list-tables B1 ·
   reviews/CRM · wave C · media picker/alt/bulk · TabPills + dashboard
   date-range. Web still owed: the redesigned trust band + Contact
   "Secure payments" row (2026-07-10).
3. **Web debt program — CLOSED 2026-07-12**: W1 ✅ (`ce8da9e`) · W2 ✅
   resilience layer · W3 ✅ cleanups/i18n/SectionHeading · W4 ✅ (`ff058e9` —
   shared `AuthFormField` over 16/17 field groups · all 17 forms `noValidate` ·
   auth titles i18n). Cut for good: destination/category landing pages · auth
   toasts. Detail per wave: [CHANGELOG](docs/CHANGELOG.md).
4. **Deliberate cuts (unscheduled):** notifications · category imagery ·
   admin e2e.
5. **Mobile backlog:** "Browse by experience" · dark-mode splash/adaptive-icon
   assets · in-app theme toggle · encrypted LargeSecureStore · EAS store builds.
6. **API debt program — CLOSED 2026-07-13 (all three waves, one day):** W1
   "Email revival" ✅ (`7c64852`) · W2 "Ops hardening" ✅ (`7e51a24`) · W3
   "CRM/analytics" ✅ (`0547270` — moderation audit · hasReview +
   /reviews/mine · costPrice margin w/ public strip + currency lock).
   Detail per wave: [CHANGELOG](docs/CHANGELOG.md).
7. **Domain + email — FULLY LIVE 2026-07-13:** `nexora-travel.agency` wired
   end-to-end ([deploy §5b](docs/05-runbooks/deploy.md)) **and API-W1 "Email
   revival" shipped** (`7c64852`): all 7 EmailTypes dispatch (2 cancellation +
   newsletter welcome net-new), refund email shows `refundedAmount`, branded
   v2 templates (react.email Barebone port), Reply-To support. Dashboard
   steps ALL DONE same day: `RESEND_REPLY_TO_EMAIL` on Render · Supabase
   custom SMTP via Resend (unlocks template editing — 2026 Supabase policy) ·
   3 branded auth templates pasted. **Email system fully closed.**

## Business-logic anchors

- **Seats/inventory:** tracked per `TourDeparture` (`seatsTotal`/`seatsBooked`),
  claimed **only at PAID** via the atomic seat-claim CTE (never at PENDING);
  overbook race → auto-refund + cancel; admin refund releases seats. Details:
  [ADR-0009](docs/02-decisions/0009-single-statement-atomic-claims.md) +
  [backend.md](docs/01-architecture/backend.md).
- **History/resume:** per-feature specs + plans live in
  [`docs/06-specs/`](docs/06-specs/) + [`docs/07-plans/`](docs/07-plans/)
  (each plan carries its STATUS block).

## Donor code worth porting (read, adapt — don't import across repos)

In the frozen `tourism-be-api` repo: `common/guards` (SupabaseJwt, Roles) ·
`common/interceptors`/`filters` (envelope) · `modules/payments` (Stripe webhook
HMAC + idempotency) · `config/` Joi validation · `prisma/` PrismaPg adapter ·
`modules/email` (Resend) · `modules/media` (Cloudinary) — all already ported;
the donor remains a reference for anything not yet carried over.

## Conventions & gotchas

Canonical home: [`CLAUDE.md`](CLAUDE.md) — "How we work" (branch-per-feature,
spec→plan→execute, TDD on logic, `/gate`, docs sweep rule) + the Gotchas
section. Windows CRLF warnings on commit are harmless.
