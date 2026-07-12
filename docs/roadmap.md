# Roadmap — tourism-platform

Phase-by-phase status. Founding phase list: [BLUEPRINT §7](BLUEPRINT.md#7-phased-roadmap) ·
decisions: [02-decisions](02-decisions/README.md) · **wave-by-wave history + test-count
progression: [CHANGELOG](CHANGELOG.md)** (the single home — status cells here stay short).

> ✅ done · 🚧 in progress · ⬜ not started.

## Phases

| Phase | Deliverable | Status |
| --- | --- | --- |
| **P0 / P0.6 / P0.8** | Nx scaffold · enforced module boundaries · donor conventions ported | ✅ done (2026-06-14) |
| **P1 (+P1.x)** | Backend: fresh Prisma schema + RLS · auth · CRUD · bookings + Stripe/PayPal · media · reviews/wishlist/enquiry/stats · seed + typed client + e2e · pg-boss jobs | ✅ complete + deployed (Render). Extended post-P1 by blog-v2 BE, refund execution + cancellation queue, site-media, CRM waves, media-library GC and dashboard range/per-currency — see [CHANGELOG](CHANGELOG.md). **439 unit + 8 e2e tests.** |
| **P2** | Design system: `@tourism/tokens` + `@tourism/ui` (+ `@tourism/mobile-ui` in P5) | ✅ done — "Emerald Heritage" Style Dictionary tokens (no-hex enforced) · 54 shadcn/Base UI components · RN hex theme (P5 W1). |
| **P3** | Web (customer): marketing · catalogue · booking · account | ✅ complete + deployed (Vercel) — all surfaces on real data, booking money-path live (Stripe/PayPal + private requests), a11y/SEO/perf polish done, brand chrome admin-managed. Debt program W1 (review form · suitableFor · contact leads) + W2 (resilience: loading/error/404 + empty-vs-failed) done; W3 next. Current surface map: [frontend.md](01-architecture/frontend.md). **252 tests.** |
| **P4** | Admin: CRUD + operations + media + appearance + dashboard | ✅ complete + deployed (Vercel) — full CRUD, bookings/refunds + cancellation queue, reviews/CRM, media library (reuse picker · alt · bulk delete), Appearance, dashboard (date-range + per-currency). Debt program B1→B2→C→D1→D2 closed 2026-07-12. **264 tests.** |
| **DEPLOY** | Free-tier cloud deploy | ✅ live — web + admin on Vercel · API on Render (`/health` + cron-job.org keep-alive) · DB on Supabase. Runbook: [deploy](05-runbooks/deploy.md). |
| **P5** | Mobile (Expo): browse → detail → booking → account | ✅ feature-complete (W1→W4) — money path ports web logic verbatim; hosted checkout + self-verifying result screen. **153 tests** (+ mobile-ui 34). ⚠️ combined on-device pass still owed. |
| **P5.5** | Mobile app-native UX pass | ✅ complete — N1 Feel (ripple/haptics/motion) · N2 Patterns (bottom sheets + Airbnb-style stepped booking) · N3 IA & Home (5 tabs w/ Trips · task-first Home). Same on-device pass owed. |
| **P6** | Content/SEO: blog + trust polish | ✅ complete — blog reader + blog-v2 all 5 waves (tags/related-tours · reader funnel · inline body images · reader polish · newsletter + RSS). |

## What remains (not phase work)

- ⚠️ Combined **mobile on-device pass** (N1+N2+N3+W4 checklists) — see
  [HANDOFF](../HANDOFF.md#next-actions).
- User **visual pass** on the deployed admin (debt-program surfaces).
- Deliberate cuts (unscheduled): notifications · category imagery · admin e2e.
- Domain-gated: Resend outbound email + Supabase custom-domain confirmation.

> Dev-tooling note: the Windows Turbopack dev-server freeze and its `--webpack`
> pin are documented in
> [local-dev.md](05-runbooks/local-dev.md#web-dev-server-eats-ram--freezes-the-machine-windows--known-issue).
