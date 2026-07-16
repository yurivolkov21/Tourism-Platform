# Roadmap — tourism-platform

Phase-by-phase status. Founding phase list: [BLUEPRINT §7](BLUEPRINT.md#7-phased-roadmap) ·
decisions: [02-decisions](02-decisions/README.md) · **wave-by-wave history + test-count
progression: [CHANGELOG](CHANGELOG.md)** (the single home — status cells here stay short).

> ✅ done · 🚧 in progress · ⬜ not started.

## Phases

| Phase | Deliverable | Status |
| --- | --- | --- |
| **P0 / P0.6 / P0.8** | Nx scaffold · enforced module boundaries · donor conventions ported | ✅ done (2026-06-14) |
| **P1 (+P1.x)** | Backend: fresh Prisma schema + RLS · auth · CRUD · bookings + Stripe/PayPal · media · reviews/wishlist/enquiry/stats · seed + typed client + e2e · pg-boss jobs | ✅ complete + deployed (Render). Extended post-P1 by blog-v2 BE, refund execution + cancellation queue, site-media, CRM waves, media-library GC and dashboard range/per-currency, and the AI concierge chat (2026-07-14 — first SSE surface, AI SDK v7 + Claude Haiku) — see [CHANGELOG](CHANGELOG.md). **541 unit + 8 e2e tests.** |
| **P2** | Design system: `@tourism/tokens` + `@tourism/ui` (+ `@tourism/mobile-ui` in P5) | ✅ done — "Emerald Heritage" Style Dictionary tokens (no-hex enforced) · 54 shadcn/Base UI components · RN hex theme (P5 W1). |
| **P3** | Web (customer): marketing · catalogue · booking · account | ✅ complete + deployed (Vercel) — all surfaces on real data, booking money-path live (Stripe/PayPal + private requests), a11y/SEO/perf polish done, brand chrome admin-managed. Debt program W1→W4 CLOSED 2026-07-12 (W4: shared AuthFormField · all 17 forms noValidate · auth titles i18n). Contact Launcher 2026-07-14 (WhatsApp deep-link + enquiry popover, env-driven) + AI concierge chat panel 2026-07-14 (useChat over the API). Current surface map: [frontend.md](01-architecture/frontend.md). **300 tests.** |
| **P4** | Admin: CRUD + operations + media + appearance + dashboard | ✅ complete + deployed (Vercel) — full CRUD, bookings/refunds + cancellation queue, reviews/CRM, media library (reuse picker · alt · bulk delete), Appearance, dashboard (date-range + per-currency). Debt program B1→B2→C→D1→D2 closed 2026-07-12. **266 tests.** |
| **DEPLOY** | Free-tier cloud deploy | ✅ live — web + admin on Vercel · API on Render (`/health` + cron-job.org keep-alive) · DB on Supabase · custom domain `nexora-travel.agency` + Resend outbound email since 2026-07-13. Runbook: [deploy](05-runbooks/deploy.md). |
| **P5** | Mobile (Expo): browse → detail → booking → account | ✅ feature-complete (W1→W4) — money path ports web logic verbatim; hosted checkout + self-verifying result screen. **153 tests** (+ mobile-ui 34). Combined device pass ✅ 2026-07-15. |
| **P5.5** | Mobile app-native UX pass | ✅ complete — N1 Feel (ripple/haptics/motion) · N2 Patterns (bottom sheets + Airbnb-style stepped booking) · N3 IA & Home (5 tabs w/ Trips · task-first Home). Device pass ✅ 2026-07-15 (incl. W4 payment loop, after Expo Go boot fix `13ad533`). |
| **P5.6** | Mobile dark redesign "Nexora Dark Heritage" (Navel-inspired) | ✅ shipped 2026-07-15 (`bd67d54`) — dark-first tokens + 6 primitives (ScrimImage · FloatingTabBar · StickyCTABar · GlowBadge · Card media · Button ready) across every screen; money-path adversarial review 5/6 findings fixed. **mobile-ui 47 tests.** |
| **P5.7** | Mobile screen-by-screen Navel parity | 🔵 in flight — per-screen cadence (analyze vs [screen index](06-specs/2026-07-15-navel-screen-index.md) → approve → small branch → merge). **S1 ✅** (onboarding + BrandSplash) · **S2 ✅** (auth: AuthHero dissolve + underline fields) · **S3 ✅ 2026-07-16** (native legal screens; LegalDoc moves to @tourism/i18n as the web+mobile single source) · **S4 ✅ 2026-07-16** (Home = Screen-17 region browser: full-height N/C/S rail + destination cards, container-less Navel tab bar). Next screen: TBD with the user. |
| **P6** | Content/SEO: blog + trust polish | ✅ complete — blog reader + blog-v2 all 5 waves (tags/related-tours · reader funnel · inline body images · reader polish · newsletter + RSS). |

## What remains (not phase work)

- User **visual pass** on the deployed admin (debt-program surfaces).
- Deliberate cuts (unscheduled): notifications · category imagery · admin e2e.
- API debt program — **CLOSED 2026-07-13**: W1 email ✅ (`7c64852`) · W2 ops
  hardening ✅ (`7e51a24`) · W3 CRM/analytics ✅ (`0547270`).
- ~~Domain-gated: Resend outbound email~~ → **fully closed 2026-07-13**:
  domain wired ([deploy §5b](05-runbooks/deploy.md)) **+ API-W1 email revival**
  (`7c64852` — all 7 EmailTypes dispatch, branded v2 templates, Reply-To,
  newsletter welcome). Remaining: dashboard steps with the user (Render
  replyTo env · Supabase template paste · optional SMTP).

> Dev-tooling note: the Windows Turbopack dev-server freeze and its `--webpack`
> pin are documented in
> [local-dev.md](05-runbooks/local-dev.md#web-dev-server-eats-ram--freezes-the-machine-windows--known-issue).
