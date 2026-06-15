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
| **P1** | **Backend:** fresh Prisma schema + port infra + seed | ⬜ next |
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
| **P1.3** | Auth: SupabaseJwtGuard + RolesGuard + decorators + users/auth sync | `ADMIN_EMAILS` allowlist |
| **P1.4** | CRUD: destinations · tours (+itinerary, **+M:N**) · departures | M:N changes DTO/zod shape vs donor |
| **P1.5** | Bookings + **multi-gateway payments (Stripe + MoMo)** + outbox email | webhook/IPN HMAC; `toProviderAmount` (zero-decimal/VND, R1) |
| **P1.6** | Media (Cloudinary) + uploads (signed URL) + reconcile job | store `public_id`, derive URLs |
| **P1.7** | Reviews + wishlist + **enquiry** + admin-stats | |
| **P1.x (jobs)** | **pg-boss** module: outbox + cron (abandoned-booking cleanup, media reconcile) | [ADR-0007](decisions/0007-pgboss-outbox-jobs.md); land alongside P1.5/P1.6 |
| **P1.8** | Seed + Swagger + generate `shared/core` API client + tests (≥80% logic) | wires `/seed` + `/regen-types` |

### P1 prerequisites (need from product owner)

- Decisions **D-P1.1, D-P1.3–D-P1.6** in [decisions](decisions/README.md) (D-P1.2/0.7/0.8 resolved via ADRs).
- Secrets/DB to run locally: Supabase (DATABASE_URL + DIRECT_URL + keys), **Stripe** test, **MoMo** test, Cloudinary, Resend, Sentry DSN → `apps/api/.env`.

## Donor code worth porting

See HANDOFF.md §"Donor code worth porting" for exact paths in
`tourism-be-api/apps/api/src/` (guards, interceptors, filters, stripe, config, prisma, email, media).
