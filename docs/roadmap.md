# Roadmap — tourism-platform

Phase-by-phase plan. Each phase = its own spec + plan + branch (spec→plan→execute).
Founding phase list: [BLUEPRINT §7](BLUEPRINT.md#7-phased-roadmap). Decisions: [decisions](02-decisions/README.md).

> Update the status column as work lands. ✅ done · 🚧 in progress · ⬜ not started.

## Phases

| Phase | Deliverable | Status |
| --- | --- | --- |
| **P0** | Nx scaffold: apps + libs + tags | ✅ done (`d720036`) |
| **P0.6** | Module boundaries (ESLint flat-config + enforce-module-boundaries) | ✅ done |
| **P0.8** | Port donor conventions + rename `@org`→`@tourism` + AI cleanup | ✅ done |
| **P1** | **Backend:** fresh Prisma schema + port infra + seed | ✅ **complete** (P1.1–P1.8 + **P1.x** done): schema/auth/CRUD/bookings/Stripe+PayPal/media/reviews+wishlist+enquiry+stats/seed+client+e2e + pg-boss jobs (outbox emails + cron) |
| **P2** | Design system: `shared/tokens` + `web/ui` (+ `mobile/ui` later) | ✅ **done** — Style Dictionary tokens (**"Emerald Heritage"**, no-hex enforced) + shadcn/Base UI 54 comps in `@tourism/ui` |
| **P3** | Web (customer): home → destinations → tours → detail → booking → account | 🚧 **in progress** — home + destinations (overview + **3 region pages w/ per-region L2 design** + rich enquiry form) + content pages (`/faq` `/privacy` `/terms`) done; tours/detail/about/contact + real-data wiring next (see P3 breakdown) |
| **P4** | Admin: manage tours/destinations/departures/media/reviews/bookings | ⬜ |
| **P5** | Mobile (Expo): browse → detail → booking → account (reuse `shared/core`) | ⬜ |
| **P6** | Content/SEO (blog/tips) + trust polish | ⬜ |

## P1 — Backend breakdown (proposed sub-phases)

Each sub-phase its own spec→plan→branch. Detail/decisions: [decisions](02-decisions/README.md) (D-P1.*).

EN-only ([ADR-0005](02-decisions/0005-en-only.md)); security/integrity hardened
([ADR-0008](02-decisions/0008-security-integrity-hardening.md)) throughout.

| Sub | Scope | Notes |
| --- | --- | --- |
| ✅ **P1.1** | Prisma schema (EN-only, M:N, multi-gateway, FKs/CHECK) + migration + **RLS** + PrismaService (PrismaPg) + `prisma.config.ts` + Joi env | **done** — migrated to new Supabase project (SG) |
| ✅ **P1.2** | Envelope (`ApiResponse`→`@tourism/core`) + TransformInterceptor + HttpExceptionFilter + `@SkipTransform`; helmet/CORS; Swagger; **Sentry** | **done** — smoke-tested (DB connect + envelope). Raw-body→P1.5, auth decorators→P1.3 |
| ✅ **P1.3** | Auth: SupabaseJwtGuard + RolesGuard + decorators (`@Public`/`@Roles`/`@CurrentUser`) + auth/users sync (`/auth/sync`, `/auth/admin/sync`, `/users/me`) | **done** — global guards; smoke-tested (public 200 / protected 401). `ADMIN_EMAILS` allowlist |
| ✅ **P1.4** | CRUD: **destinations ✅** · **tours ✅** (+categories, +itinerary/FAQs/policies, **+M:N**) · **departures ✅** (nested, seat/date guards) | done: P1.4a destinations · P1.4b tours/categories · P1.4c departures. M:N + slug refs changed DTO shape vs donor |
| ✅ **P1.5** | Bookings + **multi-gateway payments (Stripe + PayPal)** | done: P1.5a bookings core · P1.5b Stripe (checkout/webhook/refund, atomic seat-claim CTE) · P1.5c PayPal (Orders v2, capture-on-return). **MoMo→PayPal pivot** ([ADR-0006](02-decisions/0006-multi-gateway-momo.md)). Emails deferred → P1.x |
| ✅ **P1.6** | Media (Cloudinary) signed direct upload + media-set endpoints + read-attach | done: `lib/cloudinary-url`, `modules/{uploads,media}`, `PUT /admin/{tours,destinations}/:slug/media`. Reconcile/destroy job → P1.x |
| ✅ **P1.7** | Reviews + wishlist + **enquiry** + admin-stats (+ user-avatar wiring) + donor-parity merchandising | done: P1.7a reviews (#15) · P1.7b wishlist+enquiry (#16, throttle 5/min + honeypot) · P1.7c admin-stats+user-avatar (#17) · **P1.7d enquiry lead fields** (#23, nationality/travelDate/groupSize/budgetTier/interests — Lily's form parity) · **P1.7e tour merchandising** (#24, `TravellerType` suitableFor + `TourBadge` badges). 187 api tests |
| ✅ **P1.x (jobs)** | **pg-boss** module: outbox emails (Resend — confirm/refund/review-approved/enquiry) + cron (abandoned-booking cleanup, media reconcile incl. Cloudinary destroy) | done: P1.x-a outbox+emails (PR #21, `Outbox` table written atomically in the seat-claim CTE; ESM dynamic-import) · P1.x-b cron (PR #22, `MediaGarbage` table + `*/15m` cleanup + daily reconcile). [ADR-0007](02-decisions/0007-pgboss-outbox-jobs.md). 184 api tests |
| ✅ **P1.8** | Seed + generate `shared/core` API client + tests (≥80% logic) + e2e | done: P1.8a seed (PR #18, idempotent catalog + self-signed PAID booking) · P1.8b `@tourism/core` typed client (PR #19, openapi-typescript + openapi-fetch, wired `/regen-types`) · P1.8c supertest e2e + coverage ≥80% (PR #20, stmts 81.9% · 162 unit tests). Wired `/seed` + `/regen-types` |

### P1 prerequisites (need from product owner)

- Decisions **D-P1.1, D-P1.3–D-P1.6** in [decisions](02-decisions/README.md) (D-P1.2/0.7/0.8 resolved via ADRs).
- Secrets/DB to run locally: Supabase (DATABASE_URL + DIRECT_URL + keys), **Stripe** test, **MoMo** test, Cloudinary, Resend, Sentry DSN → `apps/api/.env`.

## P3 — Web (customer) breakdown

Layout-first with fixtures shaped like the eventual `@tourism/core` DTOs (wire real data later);
tokens-only (no-hex), reuse `@tourism/ui`, copy in `@tourism/i18n`. Plan:
[p3-web-build-plan](07-plans/2026-06-21-p3-web-build-plan.md) · spec:
[p3-destinations](06-specs/2026-06-21-p3-destinations-design.md).

| Page / area | Route | Status |
| --- | --- | --- |
| **Home** (Lily-style clone) | `/` | ✅ hero · destinations bento · experiences · featured · why-choose · trust · blog-teaser · enquiry |
| **Destinations overview** | `/destinations` | ✅ hero · full-bleed region mosaics (feature tiles) · when-to-visit · popular (image posters) · testimonials · travel-tips · enquiry |
| **Region pages** | `/destinations/[region]` | ✅ SSG ×3 (northern / central / southern) — hero · intro bento · highlights · **per-region L2 signature** (North = dark adventure-stats · Central = heritage timeline · South = delta image-postcards) · tours (tabs, `?d=` client-read) · gallery · value-props · **rich Plan-your-trip form** (maps Enquiry model). Replaced per-destination `[slug]`; 404 on unknown region. |
| **FAQ** | `/faq` | ✅ searchable grouped accordion (category icons) · sticky TOC · FAQPage JSON-LD |
| **Privacy / Terms** | `/privacy` `/terms` | ✅ legal pages — **draft, pending legal review** (placeholders + review callout) |
| **Nav / footer** | — | ✅ Tours (experiences) dropdown + Destinations dropdown **→ per-region pages** (`/destinations/[region]`; regions also in mobile menu) · footer wired to /faq /privacy /terms |
| **Shared content template** | — | ✅ `ContentHero` (emerald header) + `OnThisPage` (sticky TOC scroll-spy) |
| Tours listing | `/tours` | ⬜ filterable `TourCard` grid |
| Tour detail | `/tours/[slug]` | ⬜ gallery · itinerary · sticky booking box |
| About / Contact | `/about` `/contact` | ⬜ (standalone blocks built, not yet routed) |
| Booking + account | — | ⬜ (later in P3) |
| **Wire real data** | — | ⬜ replace fixtures with the live `@tourism/core` client (deferred to end of P3) |

> **⚠ Legal note:** `/privacy` + `/terms` are grounded drafts with bracketed placeholders and a
> "pending review" callout. They **must be reviewed by qualified counsel** and the placeholders
> completed before launch. Long-form content lives in `apps/web/src/content/{privacy,terms}.ts`.

## Donor code worth porting

See HANDOFF.md §"Donor code worth porting" for exact paths in
`tourism-be-api/apps/api/src/` (guards, interceptors, filters, stripe, config, prisma, email, media).
