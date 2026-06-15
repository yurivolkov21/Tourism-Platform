# Architecture

Overall system architecture — the *current* technical map (grows as code lands).
Founding rationale: [../BLUEPRINT.md](../BLUEPRINT.md).

**Deep dives:** [data-model.md](data-model.md) · [backend.md](backend.md) · [frontend.md](frontend.md)

> Skeleton — fill as the matching work lands.

## 1. Monorepo layout (Nx 22 + pnpm)

```text
apps/   api (NestJS 11) · web + admin (Next.js 16) · mobile (Expo SDK 54)
libs/   shared/{core,tokens,i18n} · web/ui · mobile/ui
```

| Project | Tags | Role |
| --- | --- | --- |
| `@tourism/api` | `scope:api,type:app` | NestJS REST API (+ Swagger) |
| `@tourism/web` | `scope:web,type:app` | Customer Next.js app |
| `@tourism/admin` | `scope:admin,type:app` | Admin Next.js app |
| `@tourism/mobile` | `scope:mobile,type:app` | Expo / React Native app |
| `@tourism/core` | `scope:shared,type:data-access` | types · zod · API client · domain logic |
| `@tourism/tokens` | `scope:shared,type:ui` | design tokens → web CSS vars + RN theme |
| `@tourism/i18n` | `scope:shared,type:util` | EN copy catalog (EN-only) |
| `@tourism/ui` | `scope:web,type:ui` | web design system |
| `@tourism/mobile-ui` | `scope:mobile,type:ui` | mobile design system |

## 2. Module boundaries

Enforced in root `eslint.config.mjs` via `@nx/enforce-module-boundaries`
(two axes, ANDed). Bad imports **fail lint**. Full rules: [BLUEPRINT §3](../BLUEPRINT.md).

- **scope:** `shared`→shared · `api`→api,shared · `web`→web,shared · `mobile`→mobile,shared · `admin`→admin,**web**,shared ([ADR-0004](../decisions/0004-admin-reuses-web-ui.md))
- **type:** `app`→feature,ui,data-access,util (apps ↛ apps) · `ui`→ui,data-access,util · `data-access`→data-access,util · `util`→util

## 3. The reuse engine — `libs/shared/*`

The thing the donor never had. `shared/core` (types/zod/client/logic) +
`shared/tokens` + `shared/i18n` are **platform-agnostic** (boundary lint enforces
`scope:shared` → only `scope:shared`) and consumed by web · admin · mobile.

📝 *Public API surface of each shared lib — fill as built (P1 core types, P2 tokens).*

## 4. Auth & payments

- **Auth = Supabase** — API verifies JWT (JWKS + HS256 fallback), mirrors users locally; `ADMIN_EMAILS` allowlist + RolesGuard. Port from donor. Detail: [backend.md](backend.md).
- **Payments = Stripe + MoMo** (multi-gateway, [ADR-0006](../decisions/0006-multi-gateway-momo.md)) — Stripe (international) + MoMo (VN domestic). Each: own webhook/IPN (raw-body + HMAC), shared `PaymentEvent` idempotency + seat-reservation core. Port Stripe from donor.

## 5. Cross-cutting

- **Response envelope:** `{ data, error, meta }` on every response (success via interceptor, failure via filter).
- **Pooler gotcha:** Supabase transaction pooler (`connection_limit=1`) → `Promise.all` for parallel reads, not `$transaction`.
- **CI:** `nx run-many -t lint typecheck test` + `build --exclude=@tourism/mobile` (Expo EAS build excluded).

## 6. Security & integrity ([ADR-0008](../decisions/0008-security-integrity-hardening.md))

Tighter than the donor. RLS on all tables (defense-in-depth) + API-layer auth ·
real FKs where cheap (`refundedById→User SetNull`) · MediaAsset polymorphic +
reconcile job · CHECK constraints · email-unique at DB · webhook HMAC (Stripe +
MoMo) · secrets via Joi fail-fast · helmet/CORS/HSTS · Sentry. Risk register:
[risks.md](risks.md).

## 7. Reliability ([ADR-0007](../decisions/0007-pgboss-outbox-jobs.md))

**pg-boss** on the same Postgres: transactional outbox (emails), retries, and
cron jobs (abandoned-booking cleanup, Cloudinary orphan reconcile).
