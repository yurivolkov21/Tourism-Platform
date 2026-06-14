# HANDOFF — tourism-platform (resume here)

**Read this first when opening a new session.** Full plan: [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).
Design references study: [`docs/reference-sites-analysis.md`](docs/reference-sites-analysis.md).

## What this is

A **greenfield rebuild** of a tourism booking platform, styled after
**https://lilystravelagency.com/** (primary design reference) + Nom Nom Travel.
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
| i18n | EN/VI from day one (parity enforced) |
| Direction | Lily-adapted (warm, trust-forward) |

## Current state — P0 scaffold DONE (commit `d720036` on `main`)

```
apps/   api (NestJS 11) · web + admin (Next 16) · mobile (Expo SDK 54)
libs/   shared/{core,tokens,i18n} · web/ui (React) · mobile/ui (RN)
```
- 9 projects, tags `scope:*` + `type:*` set. `api` build verified (webpack).
- pnpm `allowBuilds` policy is in **`pnpm-workspace.yaml`** (NOT package.json — pnpm 11 ignores the package.json `pnpm` field).
- Project names are currently `@org/*` (Nx default) — rename to `@tourism/*` in P0.8.

## Next steps (resume order)

1. **P0.6 — Module boundaries** (the reason we picked Nx): set up ESLint flat-config + `@nx/enforce-module-boundaries` with `depConstraints` by tags so bad imports fail CI. Rules (from BLUEPRINT §3):
   - `type:app` → may import `type:feature|ui|data-access|util`; apps can't import apps.
   - `scope:web` ↛ `scope:mobile` (and vice-versa); both → `scope:shared`.
   - `scope:shared` → only `scope:shared` (keeps the reuse engine platform-agnostic).
   - Read live Nx docs for the flat-config wiring (version-sensitive).
2. **P0.8 — Port conventions + cleanup:** copy `CLAUDE.md`, `.claude/commands/` (`/gate`,`/seed`,`/regen-types`,`/new-feature`) and CI (`.github/workflows/ci.yml`) from the donor; rename `@org/source`→`@tourism/source` and `@org/*`→`@tourism/*`; remove Nx-added AI configs we don't use (`.codex/.cursor/.gemini/.opencode`, `opencode.json`).
3. **P1 — Backend:** fresh Prisma schema (data model above, BLUEPRINT §6) + **port infra** from donor (paths below) + seed.
4. Then P2 design system → P3 web → P4 admin → P5 mobile (BLUEPRINT §7).

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

- **Spec → plan → execute** for multi-step features (`docs/` specs+plans); **TDD on pure logic**; **EN/VI parity** enforced; **one feature = one branch**, confirm before merge.
- Run **`/gate`** before declaring green (lint+typecheck+test+build). For Nx: `pnpm nx run-many -t lint typecheck test build` (or affected).
- Windows: CRLF warnings on commit are harmless. pnpm 11 active; Node ≥ 22.

## Gotchas

- pnpm settings (overrides, allowBuilds) live in **`pnpm-workspace.yaml`**, not package.json.
- Nx 22 generators: two libs can't share a leaf name (e.g. `ui`) → pass `--name` (mobile/ui is `mobile-ui`).
- Nx generators run `pnpm install` internally — an un-approved build script blocks them (fixed via `allowBuilds`).
- `tsc --noEmit` includes `*.spec.ts`; `nest build` excludes them — run typecheck, not just build (donor CI lesson).
