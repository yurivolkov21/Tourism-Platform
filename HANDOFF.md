# HANDOFF — tourism-platform (resume here)

**Read this first when opening a new session.** Full plan: [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).
Design references study: [`docs/reference/reference-sites-analysis.md`](docs/reference/reference-sites-analysis.md).

## What this is

A **greenfield rebuild** of a tourism booking platform, styled after
**<https://lilystravelagency.com/>** (primary design reference) + Nom Nom Travel.
Nx + pnpm monorepo with **mobile from day one**.

- **This repo (`c:\develop\Apps\Main-Projects\tourism-platform`)** = the new, active project.
- **Donor repo (`c:\develop\Apps\Main-Projects\tourism-be-api`)** = the previous build, now **FROZEN reference** — read it to **port proven code**, but **do not modify it**.

## Why we rebuilt (Yuri's intent)

Clean, deliberately-designed **data model** (past decisions felt hasty), tighter
data control, add **mobile**, and a coherent Lily-style FE (no "thập cẩm" patching).
Strategy: greenfield + keep donor as a safety net to port from. Keep our
**self-serve online booking** (Stripe) — the edge Lily lacks (they close via chat).

## Locked decisions

| Area | Choice |
| --- | --- |
| Monorepo | **Nx 22 + pnpm** |
| Mobile | **Expo / React Native** (max code reuse with web via shared libs) |
| Backend | **NestJS** — *fresh clean Prisma schema* + **PORT** donor's proven infra |
| Web / Admin | **Next.js 16** App Router, Lily-style |
| Data model | multi-destination **M:N**, lightweight **Enquiry** ("Inquire Now"), + highlights / FAQ / policies / price-anchor (`compareAtPrice`) |
| i18n | **English-only** (ADR-0005; was EN/VI) |
| Direction | Lily-adapted (warm, trust-forward) |

## Current state — P0 + P1.1–P1.4 DONE (`main` @ `f6f20f1`)

```text
apps/   api (NestJS 11) · web + admin (Next 16) · mobile (Expo SDK 54)
libs/   shared/{core,tokens,i18n} · web/ui (React) · mobile/ui (RN)
```

- **P0 / P0.6 / P0.8** — 9-project scaffold; module boundaries enforced
  (`@nx/enforce-module-boundaries`, scope+type); `@tourism/*` scope; donor
  conventions ported; AI cruft removed. pnpm `overrides`/`allowBuilds` live in
  **`pnpm-workspace.yaml`** (pnpm 11 ignores the package.json `pnpm` field).
- **P1.1** — fresh Prisma schema (9 enum / 15 model, EN-only, M:N, multi-gateway,
  FK/CHECK) + migration + **RLS** + PrismaService (PrismaPg) + Joi env. Migrated to
  a **live Supabase project** (`tourism-platform`, SG, ref `zxryyqhczgrbidjocwly`;
  creds in gitignored `apps/api/.env`). Donor "tour-booking" untouched (ADR-0001).
- **P1.2** — response envelope (`ApiResponse` → `@tourism/core`) + TransformInterceptor
  + HttpExceptionFilter + bootstrap (helmet/CORS/Swagger/Sentry/dotenv).
- **P1.3** — auth: SupabaseJwtGuard (jose JWKS) + RolesGuard + `@Public`/`@Roles`/
  `@CurrentUser` + `/auth/sync`, `/auth/admin/sync`, `/users/me` (global guards).
- **P1.4** — CRUD epic, all merged: **P1.4a** destinations · **P1.4b** tours +
  tour-categories (M:N `destinationSlugs[]`+`primaryDestinationSlug`, nested
  itinerary/FAQs/policies, slug refs) · **P1.4c** departures (nested under tour,
  seat/date guards). Pattern: public + admin controllers, `Promise.all` pagination
  (departures = arrays, bounded), slugify, `P2002→409` / `P2003→409`, class-validator
  DTOs, service unit tests, `/gate`, smoke.
- **Tests:** 58 passing (api). CI green (lint·typecheck·test·build + CodeQL +
  GitGuardian). **Dependabot: 0 open** (js-yaml DoS resolved via `^4.2.0` override).
- **Gate:** `nx run-many -t lint typecheck test` + `build` green; mobile `build`
  is an Expo EAS cloud build (needs global `eas-cli`) → excluded from the local gate.

## Next steps (resume order)

1. **P1.5 — Bookings + multi-gateway payments (Stripe + MoMo)** + outbox email —
   *next*. Port donor `modules/payments` (raw-body + HMAC webhook + idempotency) +
   bookings flow (seat lock on `TourDeparture.seatsBooked` under tx); `toProviderAmount`
   for zero-decimal/VND (R1). `DeparturesService` already exported for the seat lock.
2. **P1.6** media (Cloudinary) · **P1.7** reviews + wishlist + enquiry + admin-stats ·
   **P1.x** pg-boss jobs (outbox/cron) · **P1.8** seed + Swagger + `shared/core` client.
3. Then P2 design system → P3 web → P4 admin → P5 mobile (BLUEPRINT §7).

> Live resume buffer with finer detail: [`.remember/remember.md`](.remember/remember.md).
> Per-phase specs/plans: [`docs/specs/`](docs/specs/) + [`docs/plans/`](docs/plans/).

## Donor code worth porting (read, adapt — don't import across repos)

In `c:\develop\Apps\Main-Projects\tourism-be-api\apps\api\src\`:

- `common/guards/` SupabaseJwtGuard (JWKS + HS256), RolesGuard
- `common/interceptors/` TransformInterceptor (envelope), `common/filters/` HttpExceptionFilter
- `modules/payments/` Stripe webhook (raw-body + HMAC + idempotency), `stripe.service.ts`
- `config/` Joi env validation; `prisma/` PrismaPg adapter + pooler setup
- `modules/email/` Resend; `modules/media/` Cloudinary
- `prisma/schema.prisma` (reference the GOOD bones; redesign cleanly)
- Donor `docs/postman/` harness, `docs/runbooks/`, CI patterns.

## Working conventions (carry from donor)

- **Spec → plan → execute** for multi-step features (`docs/` specs+plans); **TDD on pure logic**; **English-only** (ADR-0005); **one feature = one branch**, confirm before merge.
- Run **`/gate`** before declaring green (lint+typecheck+test+build). For Nx: `pnpm nx run-many -t lint typecheck test build` (or affected).
- Windows: CRLF warnings on commit are harmless. pnpm 11 active; Node ≥ 22.

## Gotchas

- pnpm settings (overrides, allowBuilds) live in **`pnpm-workspace.yaml`**, not package.json.
- Nx 22 generators: two libs can't share a leaf name (e.g. `ui`) → pass `--name` (mobile/ui is `mobile-ui`).
- Nx generators run `pnpm install` internally — an un-approved build script blocks them (fixed via `allowBuilds`).
- `tsc --noEmit` includes `*.spec.ts`; `nest build` excludes them — run typecheck, not just build (donor CI lesson).
