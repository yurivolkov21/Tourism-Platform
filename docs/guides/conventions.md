# Conventions — tourism-platform

Longer-form companion to the root [`CLAUDE.md`](../../CLAUDE.md) (the short,
canonical rules). If these two ever disagree, **CLAUDE.md wins** — then reconcile.

> Skeleton — fill sections as the matching work lands.

## 1. Working agreement (standing)

See CLAUDE.md §"How we work". In one line each:

- **One feature = one branch** (`feat/…`, `chore/…`, `docs/…`); review → merge → delete. Never feature-work on `main`.
- **Ask before** a new feature/phase; **confirm before** merge / push / branch-delete.
- **Spec → plan → execute** for multi-step work (specs+plans under `docs/`).
- **TDD on pure logic** (≥80% on new logic); visual/layout via e2e.
- **Frontend:** layout-first, **theme tokens only** (`@tourism/tokens`), reuse `@tourism/ui` first.
- **English-only** ([ADR-0005](../decisions/0005-en-only.md)); copy centralized in `@tourism/i18n` (EN scaffold).
- **`/gate` before declaring green.**
- **Conventional Commits**, no AI attribution.

## 2. Code style

📝 *Defer to global rules + CLAUDE.md for now; capture project-specific deltas here as they appear.*

- TS: explicit types on public APIs, `unknown` over `any`, immutable updates, Zod at boundaries.
- Files small & cohesive (≤~400 lines typical, 800 max); early returns over deep nesting.

## 3. Module boundaries (enforced)

Bad cross-scope/cross-type imports **fail lint** (`eslint.config.mjs`,
`@nx/enforce-module-boundaries`). Full rule table: [architecture](../architecture/README.md#2-module-boundaries)
and [BLUEPRINT §3](../BLUEPRINT.md). TL;DR: `scope:shared` → only `scope:shared`; apps can't import apps.

## 4. i18n (English-only)

EN-only ([ADR-0005](../decisions/0005-en-only.md)). User-facing copy is
centralized in `@tourism/i18n` (EN catalog, no VI / parity check). Schema is
single-language. Re-adding a locale later is additive (the lib stays as a
scaffold). 📝 *Catalog layout + `t()` helper — fill when `@tourism/i18n` is built.*

## 5. Testing

📝 *Runner per project (Jest/Vitest), coverage gate, e2e (Playwright) — fill as suites land.*

## 6. Tooling & skills (leverage these)

| Need | Use |
| --- | --- |
| Library/API docs (Next 16, Expo 54, Prisma, NestJS…) — **not in training data** | **context7** MCP (`resolve-library-id` → `query-docs`) |
| Kick off a feature (spec→plan→execute) | `/new-feature <desc>` · `ecc:plan` · `superpowers:writing-plans` |
| TDD discipline | `superpowers:test-driven-development` · `ecc:tdd-workflow` |
| Quality gate | `/gate` (lint·typecheck·test·build) |
| Postgres/Prisma schema design (P1) | skill **supabase-postgres-best-practices** · Supabase MCP |
| Web design system / components (P2) | skill **shadcn/ui** · Figma MCP |
| Stripe payments (P1) | Stripe MCP |
| Code review before merge | `ecc:code-review` · `ecc:security-review` |

📝 *Add MCP/skill specifics (e.g., Supabase project ref, Stripe test keys) when wired.*

## 7. Security & integrity

Hardened beyond the donor — see [ADR-0008](../decisions/0008-security-integrity-hardening.md)
and [risks.md](../architecture/risks.md). Baseline every feature respects:

- **RLS** on all tables (defense-in-depth) + API-layer `SupabaseJwtGuard`/`RolesGuard`.
- **Webhook signature** verify on raw body (Stripe HMAC + PayPal verify API); reject → 400.
- **Secrets** via env + Joi fail-fast; never hardcoded; service-role key server-only.
- **Validate at boundaries** (zod in `@tourism/core` + class-validator DTOs).
- **Integrity**: real FKs where cheap, CHECK constraints, email-unique at DB.
- **Observability**: Sentry + structured logs; never log secrets/tokens.
