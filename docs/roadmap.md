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

| Sub | Scope | Notes |
| --- | --- | --- |
| **P1.1** | Prisma schema + migration + PrismaService (PrismaPg adapter) + `prisma.config.ts` + Joi env | do first; verify migrate (DIRECT_URL) vs runtime (DATABASE_URL) |
| **P1.2** | Envelope: TransformInterceptor + HttpExceptionFilter + `ApiResponse` + common decorators/types → types to `shared/core` | port from donor |
| **P1.3** | Auth: SupabaseJwtGuard + RolesGuard + decorators + users/auth sync | `ADMIN_EMAILS` allowlist |
| **P1.4** | CRUD: destinations · tours (+itinerary, **+M:N destinations**) · departures | M:N changes DTO/zod shape vs donor |
| **P1.5** | Bookings + Stripe payments (webhook idempotency via `PaymentEvent`) + email confirmations | raw-body + HMAC |
| **P1.6** | Media (Cloudinary) + uploads (signed URL) | store `public_id`, derive URLs |
| **P1.7** | Reviews + wishlist + **enquiry** (D2) + admin-stats | |
| **P1.8** | Seed + Swagger + generate `shared/core` API client + tests (≥80% logic) | wires `/seed` + `/regen-types` |

### P1 prerequisites (need from product owner)

- Decisions **D-P1.1 … D-P1.6** in [decisions](decisions/README.md).
- Secrets/DB to run locally: Supabase (DATABASE_URL + DIRECT_URL + keys), Stripe test, Cloudinary, Resend → `apps/api/.env`.

## Donor code worth porting

See HANDOFF.md §"Donor code worth porting" for exact paths in
`tourism-be-api/apps/api/src/` (guards, interceptors, filters, stripe, config, prisma, email, media).
