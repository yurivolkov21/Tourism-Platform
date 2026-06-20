# Roadmap — tourism-platform

Phase-by-phase plan. Each phase = its own spec + plan + branch (spec→plan→execute).
Founding phase list: [BLUEPRINT §7](BLUEPRINT.md#7-phased-roadmap). Decisions: [decisions](decisions/README.md).

> Update the status column as work lands. ✅ done · 🚧 in progress · ⬜ not started.

## Phases

| Phase | Deliverable | Status |
| --- | --- | --- |
| **P0** | Nx scaffold: apps + libs + tags | ✅ done (`d720036`) |
| **P0.6** | Module boundaries (ESLint flat-config + enforce-module-boundaries) | ✅ done |
| **P0.8** | Port donor conventions + rename `@org`→`@tourism` + AI cleanup | ✅ done |
| **P1** | **Backend:** fresh Prisma schema + port infra + seed | ✅ **P1.1–P1.8 done** (schema/auth/CRUD/bookings/Stripe+PayPal/media/reviews+wishlist+enquiry+stats/seed+client+e2e). Only **P1.x (pg-boss jobs/emails)** — optional reliability layer — remains |
| **P2** | Design system: `shared/tokens` + `web/ui` + `mobile/ui` | ⬜ |
| **P3** | Web (customer): home → destinations → tours → detail → booking → account | ⬜ |
| **P4** | Admin: manage tours/destinations/departures/media/reviews/bookings | ⬜ |
| **P5** | Mobile (Expo): browse → detail → booking → account (reuse `shared/core`) | ⬜ |
| **P6** | Content/SEO (blog/tips) + trust polish | ⬜ |

## P1 — Backend breakdown (proposed sub-phases)

Each sub-phase its own spec→plan→branch. Detail/decisions: [decisions](decisions/README.md) (D-P1.*).

EN-only ([ADR-0005](decisions/0005-en-only.md)); security/integrity hardened
([ADR-0008](decisions/0008-security-integrity-hardening.md)) throughout.

| Sub | Scope | Notes |
| --- | --- | --- |
| ✅ **P1.1** | Prisma schema (EN-only, M:N, multi-gateway, FKs/CHECK) + migration + **RLS** + PrismaService (PrismaPg) + `prisma.config.ts` + Joi env | **done** — migrated to new Supabase project (SG) |
| ✅ **P1.2** | Envelope (`ApiResponse`→`@tourism/core`) + TransformInterceptor + HttpExceptionFilter + `@SkipTransform`; helmet/CORS; Swagger; **Sentry** | **done** — smoke-tested (DB connect + envelope). Raw-body→P1.5, auth decorators→P1.3 |
| ✅ **P1.3** | Auth: SupabaseJwtGuard + RolesGuard + decorators (`@Public`/`@Roles`/`@CurrentUser`) + auth/users sync (`/auth/sync`, `/auth/admin/sync`, `/users/me`) | **done** — global guards; smoke-tested (public 200 / protected 401). `ADMIN_EMAILS` allowlist |
| ✅ **P1.4** | CRUD: **destinations ✅** · **tours ✅** (+categories, +itinerary/FAQs/policies, **+M:N**) · **departures ✅** (nested, seat/date guards) | done: P1.4a destinations · P1.4b tours/categories · P1.4c departures. M:N + slug refs changed DTO shape vs donor |
| ✅ **P1.5** | Bookings + **multi-gateway payments (Stripe + PayPal)** | done: P1.5a bookings core · P1.5b Stripe (checkout/webhook/refund, atomic seat-claim CTE) · P1.5c PayPal (Orders v2, capture-on-return). **MoMo→PayPal pivot** ([ADR-0006](decisions/0006-multi-gateway-momo.md)). Emails deferred → P1.x |
| ✅ **P1.6** | Media (Cloudinary) signed direct upload + media-set endpoints + read-attach | done: `lib/cloudinary-url`, `modules/{uploads,media}`, `PUT /admin/{tours,destinations}/:slug/media`. Reconcile/destroy job → P1.x |
| ✅ **P1.7** | Reviews + wishlist + **enquiry** + admin-stats (+ user-avatar wiring) | done: P1.7a reviews (PR #15) · P1.7b wishlist+enquiry (PR #16, `@nestjs/throttler` 5/min + honeypot) · P1.7c admin-stats+user-avatar (PR #17). 155 api tests |
| **P1.x (jobs)** | **pg-boss** module: outbox emails (Resend — confirm/refund/review-approved/enquiry) + cron (abandoned-booking cleanup, media reconcile incl. Cloudinary destroy) | [ADR-0007](decisions/0007-pgboss-outbox-jobs.md); **only remaining P1 item** — optional reliability layer. Donor `modules/email` (Resend) portable; pg-boss is net-new |
| ✅ **P1.8** | Seed + generate `shared/core` API client + tests (≥80% logic) + e2e | done: P1.8a seed (PR #18, idempotent catalog + self-signed PAID booking) · P1.8b `@tourism/core` typed client (PR #19, openapi-typescript + openapi-fetch, wired `/regen-types`) · P1.8c supertest e2e + coverage ≥80% (PR #20, stmts 81.9% · 162 unit tests). Wired `/seed` + `/regen-types` |

### P1 prerequisites (need from product owner)

- Decisions **D-P1.1, D-P1.3–D-P1.6** in [decisions](decisions/README.md) (D-P1.2/0.7/0.8 resolved via ADRs).
- Secrets/DB to run locally: Supabase (DATABASE_URL + DIRECT_URL + keys), **Stripe** test, **MoMo** test, Cloudinary, Resend, Sentry DSN → `apps/api/.env`.

## Donor code worth porting

See HANDOFF.md §"Donor code worth porting" for exact paths in
`tourism-be-api/apps/api/src/` (guards, interceptors, filters, stripe, config, prisma, email, media).
