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

## Current state (2026-07-16)

**Every product phase is complete and deployed** — on the custom domain
`www.nexora-travel.agency` (admin: `admin.`) since 2026-07-13. All three debt
programs are closed: admin B1→D2 (2026-07-12) · web W1→W4 (2026-07-12) ·
**API W1→W3 (2026-07-13)**. Wave-by-wave detail: [CHANGELOG](docs/CHANGELOG.md).

- **API (P1+)** — live on **Render** (`/health` + cron-job.org keep-alive).
  Full surface: **107 endpoints** across 21 modules (CRUD · bookings ·
  Stripe/PayPal + refunds · cancellation queue + **cancel-departure
  auto-refund** · media w/ ref-safe GC · reviews/CRM w/ **moderation audit** ·
  newsletter · site-media · dashboard stats w/ `?from&to` + per-currency
  **+ cost/margin** · pg-boss outbox/cron — **all 7 EmailTypes live, branded
  v2 templates** · **AI concierge chat — first SSE surface, AI SDK v7 + Claude
  Haiku, tools over Tours/Enquiry, hard spend caps, key-optional**;
  **review moderation → on-demand web revalidation 2026-07-16** ·
  **EMAIL_CHANGED old-address notice 2026-07-16**). **558
  unit + 8 e2e tests.**
- **Design system (P2)** — `@tourism/tokens` (no-hex enforced) +
  `@tourism/ui` (59 shadcn/Base UI comps) + `@tourism/mobile-ui` (RN, 34 tests).
- **Web (P3 + P6)** — live on **Vercel**. Marketing + catalogue + booking
  money-path + account + blog (v2 complete) on real data; a11y/SEO/perf polish
  done; brand chrome admin-managed via site-media; resilience layer (loading
  skeletons · error/404/global-error boundaries · empty-vs-failed) → W4 ✅ (shared AuthFormField · noValidate completion · auth titles i18n) — **PROGRAM CLOSED 2026-07-12**. **Contact Launcher 2026-07-14** (WhatsApp `wa.me` deep-link w/ tour prefill + enquiry popover; env-driven, hides w/o `NEXT_PUBLIC_CHAT_WHATSAPP`); **AI concierge chat panel 2026-07-14** ("Chat with us" → Sheet w/ useChat + markdown; degrades when API has no key); **on-demand revalidation 2026-07-16** (tour fetches tagged `tour:<slug>` + secret-guarded `POST /api/revalidate` → moderated reviews show on next reload); **email-change confirm fix 2026-07-16** (`/auth/confirm` token_hash cross-browser + mirror re-sync); **email-change UX 2026-07-16** (single-confirm + password re-auth + password-only gate); **password UX 2026-07-16** (accurate change errors + 8+ strong policy mirroring Supabase + shared `PasswordField` meter/show-hide on register/reset/change); **tour reviews clamp+dialogs 2026-07-17** (layout-stable cards + measured Read-more + See-all API paging); **home trust real-data 2026-07-17** (live rating + tour count, fake numbers/testimonial fixture deleted, empty ⇒ hidden); **generalized on-demand revalidation 2026-07-17** (every public fetch tagged; `/blog` no longer static-until-redeploy; timers = backstop — ADR-0013). **385 tests.**
- **Admin (P4)** — live on **Vercel** (dev :3002). Full CRUD + operations
  (bookings/refunds · cancellation queue · reviews/CRM · enquiries+notes ·
  subscribers · outbox · payment-events) + media library (reuse picker · alt ·
  bulk delete; avatars hidden by default) + Appearance + dashboard
  (date-range + per-currency + margin) + motion layer; **PARTIALLY_REFUNDED
  first-class across the dashboard 2026-07-17** (tab · pipeline · URL parse ·
  widget · detail timeline). **268 tests.**
- **Mobile (P5 + P5.5 + P5.6)** — feature-complete AND fully on the
  "Nexora Dark Heritage" skin (P5.6 R1→R3 shipped 2026-07-15, `bd67d54`:
  dark-first tokens · ScrimImage/FloatingTabBar/StickyCTABar/GlowBadge ·
  money-path presentation adversarially reviewed). Expo Go dev loop only.
  Combined device pass ✅ 2026-07-15. **P5.7 screen-by-screen Navel parity
  in flight** ([index](docs/06-specs/2026-07-15-navel-screen-index.md);
  S1+S2+S3+S4 ✅). **167 tests** (+ mobile-ui 50).

Baselines: **api 572 · web 385 · admin 268 · mobile 167 · mobile-ui 50 · core 42.**

**Email-change UX (2026-07-16, `83d76a0`):** single-confirm (pairs with Supabase
Secure-email-change **OFF**) + password re-auth (`signInWithPassword` before
`updateUser`) + an `EMAIL_CHANGED` notice to the OLD address (`AuthService.upsert`
detects the mirror flip → Resend). Email change is restricted to password-only
accounts (`canChangeEmail`); Google-linked → managed-by-Google note. **Deploy
to-do: apply the migration + turn Supabase "Secure email change" OFF.**

**Email-change confirmation fix (2026-07-16, `406f02c`):** `/auth/confirm` route
(`verifyOtp` token_hash) completes signup/recovery/email-change confirmations
**cross-browser** (no PKCE verifier), then `syncUser()` refreshes the API email
mirror so a changed email shows immediately. 3 Supabase templates → `{{ .TokenHash }}`;
`/auth/callback` kept for OAuth. **Deploy to-do (Supabase dashboard): allow
`…/auth/confirm` in Redirect URLs + re-paste the 3 templates** — the code alone
doesn't take effect until the dashboard uses the new templates.

**Review moderation → on-demand web revalidation (2026-07-16, `a226da9`):** a
(un)approved review now shows on the public tour page within seconds (page stays
ISR). Web tags the tour fetches `tour:<slug>` + a secret-guarded `POST
/api/revalidate`; API POSTs it fire-and-forget after `moderateById` commits.
**Deploy to-do: set a matching `REVALIDATE_SECRET` in Render (API) + Vercel
(web)** — until then it no-ops and the 300s ISR is the backstop.

## Next actions

1. **P5.7 mobile screen-by-screen Navel parity — IN FLIGHT** (P5.6 R1→R3
   SHIPPED `bd67d54` same day). Cadence: pick screen → analyze vs the
   [102-export index](docs/06-specs/2026-07-15-navel-screen-index.md) →
   user approves scope → small branch → gate → on-device look → merge.
   Locked: onboarding→Home w/ OPTIONAL auth (guest-first stands). **S1
   SHIPPED** (`70f756e` — onboarding pager · BrandSplash · emerald native
   splash · `start-dev.ps1` auto-IP) · **S2 SHIPPED 2026-07-15** (`926ac28`
   — AuthHero 42% dissolve · TextField `underline` variant · bottom-pinned
   footers; 2 device-feedback rounds) · **S3 SHIPPED 2026-07-16** (`9584c22`
   — LegalDoc single-source in `@tourism/i18n` · native legal/[doc] reader ·
   Account rows native + cancellation policy · sign-up agree line) · **S4
   SHIPPED 2026-07-16** (`e6a74ce` — Home = Screen-17 region browser:
   fixed full-height layout, rotated N/C/S rail, fill-height destination
   cards → filtered Explore, container-less Navel tab bar w/ fade,
   "Traveller" guest greeting; device look owed — user deferred to after
   the push). Next screen: pick with the user. Baselines: mobile 167 ·
   mobile-ui 50. NOTE: ~42 local commits on `main` are UNPUSHED (user
   pushes on their signal).
2. **Contact Launcher — LIVE 2026-07-14:** `NEXT_PUBLIC_CHAT_WHATSAPP` set on
   Vercel with the owner's personal number; owner verified the wa.me chat
   end-to-end on production. Remaining: cross-account test (teammate opens the
   launcher and messages the owner).
2b. **AI Concierge Chat — MERGED 2026-07-14, deploy owed** (`74ef17f`; spec
   `docs/06-specs/2026-07-14-ai-concierge-chat-design.md`). To go live:
   **(a)** create `ANTHROPIC_API_KEY` (console.anthropic.com — owner adds
   later) and set it on Render (unset ⇒ 503 `CHAT_UNAVAILABLE`, panel shows its
   unavailable state — safe to deploy without); **(b)** ensure Render
   `NODE_VERSION` ≥ 22.12 (AI SDK v7 is ESM-only, loaded via `require(esm)`);
   **(c)** `prisma migrate deploy` for `20260714150000_add_chat_conversations`;
   **(d)** set an Anthropic console spend alert. Review findings pinned as
   accepted-for-capstone: plan STATUS
   (`docs/07-plans/2026-07-14-ai-concierge-chat.md`). Later hardening (deferred):
   scope optional-JWT guard work off high-traffic public GETs · bind a guest
   conversation to the user on mid-thread login.
3. **User visual pass on deployed surfaces** — in progress (the 2026-07-12
   avatar fix came out of it); remaining admin surfaces: list-tables B1 ·
   reviews/CRM · wave C · media picker/alt/bulk · TabPills + dashboard
   date-range. Web still owed: the redesigned trust band + Contact
   "Secure payments" row (2026-07-10).
4. **Web debt program — CLOSED 2026-07-12**: W1 ✅ (`ce8da9e`) · W2 ✅
   resilience layer · W3 ✅ cleanups/i18n/SectionHeading · W4 ✅ (`ff058e9` —
   shared `AuthFormField` over 16/17 field groups · all 17 forms `noValidate` ·
   auth titles i18n). Cut for good: destination/category landing pages · auth
   toasts. Detail per wave: [CHANGELOG](docs/CHANGELOG.md).
5. **Deliberate cuts (unscheduled):** notifications · category imagery ·
   admin e2e.
6. **Mobile backlog:** "Browse by experience" · dark-mode splash/adaptive-icon
   assets · in-app theme toggle · encrypted LargeSecureStore · EAS store builds.
7. **API debt program — CLOSED 2026-07-13 (all three waves, one day):** W1
   "Email revival" ✅ (`7c64852`) · W2 "Ops hardening" ✅ (`7e51a24`) · W3
   "CRM/analytics" ✅ (`0547270` — moderation audit · hasReview +
   /reviews/mine · costPrice margin w/ public strip + currency lock).
   Detail per wave: [CHANGELOG](docs/CHANGELOG.md).
8. **Domain + email — FULLY LIVE 2026-07-13:** `nexora-travel.agency` wired
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
