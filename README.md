# tourism-platform

An **Nx 22 + pnpm** monorepo for a Lily-style tourism booking platform — mobile from day one. All
four apps (API, web, admin, mobile) are complete and live/on-device-ready. **Brand: Nexora.**

| Project | Path | Stack | Status |
| --- | --- | --- | --- |
| `@tourism/api` | `apps/api` | NestJS 11 · Prisma 7 · Supabase · Stripe + PayPal · Cloudinary · Resend · pg-boss | ✅ P1 complete · **deployed (Render)** |
| `@tourism/web` | `apps/web` | Next.js 16 · React 19 · Tailwind v4 | 🟢 P3 + P6 (blog-v2) complete · **deployed (Vercel)** |
| `@tourism/admin` | `apps/admin` | Next.js 16 | 🟢 P4 complete · **deployed (Vercel)** |
| `@tourism/mobile` | `apps/mobile` | Expo SDK 54 / RN | 🟢 P5 + P5.5 complete (combined on-device pass owed) |
| `@tourism/core` · `tokens` · `i18n` · `web/ui` · `mobile/ui` | `libs/` | shared types/OpenAPI client · design tokens ("Emerald Heritage") · EN copy · UI (59 comps) | 🟢 in use |

Details per phase: **[docs/roadmap.md](docs/roadmap.md)** · full history: **[docs/CHANGELOG.md](docs/CHANGELOG.md)**.

**Live demo:** web → [www.nexora-travel.agency](https://www.nexora-travel.agency) · admin → [admin.nexora-travel.agency](https://admin.nexora-travel.agency) · API health → [/api/v1/health](https://tourism-api-pqwr.onrender.com/api/v1/health). *(The old `tourism-platform-{web,admin}.vercel.app` URLs still serve as fallbacks.)*

Full docs: **[docs/README.md](docs/README.md)** (map + reading path) · **new here? → [docs/04-guides/getting-started.md](docs/04-guides/getting-started.md)** · the operating contract: **[CLAUDE.md](CLAUDE.md)**.

---

## 🇻🇳 Bắt đầu nhanh (Tiếng Việt)

> Tóm tắt cho cả nhóm. Chi tiết đầy đủ ở phần **Getting started** (English) bên dưới + runbook
> **[docs/05-runbooks/local-dev.md](docs/05-runbooks/local-dev.md)**.

Yêu cầu: **Node ≥ 22** + **pnpm 11** (`corepack enable`) + một project **Supabase** (điền key vào `apps/api/.env`).

```bash
pnpm install                                                   # cài deps toàn workspace
# tạo apps/api/.env (xin key từ thành viên giữ repo, hoặc dùng Supabase của bạn)
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma generate && cd ../..
pnpm nx serve @tourism/api                                     # chạy API (watch) → http://localhost:3000/api/v1
```

Dữ liệu test:

```bash
pnpm nx run @tourism/api:reset    # XÓA sạch để test từ zero (giữ schema + tài khoản Supabase)
pnpm nx run @tourism/api:seed     # HOẶC nạp dữ liệu demo (catalog + 1 booking PAID)
```

Lệnh hay dùng: `pnpm nx <việc> @tourism/api` — `serve` (chạy watch, ~ `start:dev`), `test`, `lint`,
`build`. Test API bằng tay: mở **Swagger UI** tại `/api/docs` khi API đang chạy, hoặc xem mục
**test data** trong **[docs/05-runbooks/local-dev.md](docs/05-runbooks/local-dev.md#test-data)**. Danh mục
function (tiếng Việt): **[admin](docs/03-reference/functions-admin.md)** · **[customer](docs/03-reference/functions-customer.md)** · **[system](docs/03-reference/functions-system.md)**.

---

## Prerequisites

- **Node ≥ 22** and **pnpm 11** via Corepack — run `corepack enable` to get the pinned pnpm.
- A **Supabase** project + the service secrets (Stripe, PayPal, Cloudinary, Resend, Sentry). For local
  dev these go in `apps/api/.env` (see step 2).

## Getting started (after cloning)

```bash
# 1. Install all workspace deps
pnpm install

# 2. Backend env — create apps/api/.env (ask a maintainer for values, or use your own Supabase/keys).
#    Required keys: DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWKS_URL, SUPABASE_JWT_SECRET, ADMIN_EMAILS,
#    STRIPE_*, PAYPAL_*, CLOUDINARY_*, RESEND_*, FRONTEND_URL.  (Joi fails fast if any are missing.)

# 3. Apply DB migrations (Supabase, via DIRECT_URL)
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma generate && cd ../..

# 4. Run the API (dev / watch — the `start:dev` equivalent)
pnpm nx serve @tourism/api          # → http://localhost:3000/api/v1  ·  Swagger: /api/docs
```

> New to Nx? Commands are `pnpm nx <target> <project>` (e.g. `pnpm nx serve @tourism/api`), run from the
> repo root — no `cd` needed. Full command reference + the NestJS-`start:dev`→Nx mapping:
> **[docs/05-runbooks/local-dev.md](docs/05-runbooks/local-dev.md)**.

## Test data: from zero vs seeded

- **From zero (recommended for understanding the API)** — `pnpm nx run @tourism/api:reset` empties all
  app tables (keeps schema + your Supabase accounts). Then build every row yourself through the API; the
  **Swagger UI** (`/api/docs` on the running API) walks you through every endpoint (admin creates the
  catalog → customer books it).
- **Seeded (quick demo data)** — `pnpm nx run @tourism/api:seed` loads a demo catalog + a self-signed
  PAID booking (this is what e2e/CI use).

## Run the web & admin apps (front-ends)

Front-ends are Next.js 16 apps. Each reads its own `.env` (copy from `.env.example`).
**Dev port map:** API `:3000` · web `:3001` · admin `:3002` (no clashes).

```bash
# WEB (customer site)
cp apps/web/.env.example apps/web/.env      # set NEXT_PUBLIC_API_BASE_URL (origin, no /api/v1)
pnpm nx dev @tourism/web                    # → http://localhost:3001  (uses --webpack, see note)

# ADMIN (dashboard)
cp apps/admin/.env.example apps/admin/.env  # Supabase public keys + API origin
pnpm nx dev @tourism/admin                  # → http://localhost:3002
```

- **You don't need the backend running to see the UI.** Point `NEXT_PUBLIC_API_BASE_URL` at the
  **live Render API** (`https://tourism-api-pqwr.onrender.com`) and the web app renders real data. With
  **no** API reachable, data-fed sections (featured tours, "Explore by destination"…) render **empty by
  design** — the page hides them rather than break. That's expected, not a bug.
- **Web dev uses webpack, not Turbopack** (`next dev --webpack`, pinned in `apps/web/package.json`) — a
  Turbopack dev memory leak froze Windows machines. To preview exactly what production serves, build then
  start: `pnpm nx build @tourism/web && pnpm exec next start apps/web --port 3001`.
- **Admin sign-in** needs your email in the API's `ADMIN_EMAILS` and `http://localhost:3002` in its
  `CORS_ORIGINS` (both in `apps/api/.env`). See [apps/admin/.env.example](apps/admin/.env.example).

Full onboarding (all apps, end to end): **[docs/04-guides/getting-started.md](docs/04-guides/getting-started.md)**.

## Common commands

```bash
pnpm nx serve @tourism/api                          # dev server (watch)
pnpm nx build @tourism/api                          # production build → apps/api/dist/main.js
pnpm nx test @tourism/api                           # unit tests (jest)
pnpm nx lint @tourism/api                           # lint
pnpm nx typecheck @tourism/api                      # type-check
pnpm nx run @tourism/api:e2e                        # e2e (needs a seeded DB)
pnpm nx run-many -t lint typecheck test build       # the full quality gate
pnpm nx affected -t test                            # only what changed
pnpm nx show project @tourism/api                   # list a project's targets
pnpm nx graph                                       # dependency graph (browser)
```

## Layout

```text
apps/   api (NestJS) · web + admin (Next.js) · mobile (Expo)
libs/   shared/{core,tokens,i18n} · web/ui · mobile/ui
docs/   README.md (map) · BLUEPRINT.md · roadmap.md · 01-architecture/ · 02-decisions/ (ADRs) ·
        03-reference/ (function catalog) · 04-guides/ · 05-runbooks/ · 06-specs/ · 07-plans/
```

## Where to read next

- **[docs/README.md](docs/README.md)** — documentation map + reading path.
- **[docs/roadmap.md](docs/roadmap.md)** — phases P0–P6 + status.
- **[docs/03-reference/functions-admin.md](docs/03-reference/functions-admin.md)** · **[customer](docs/03-reference/functions-customer.md)** · **[system](docs/03-reference/functions-system.md)** — every backend function.
- **[docs/05-runbooks/local-dev.md#test-data](docs/05-runbooks/local-dev.md#test-data)** — manual API
  testing (from-zero vs seeded) via the Swagger UI.
- **[docs/05-runbooks/local-dev.md](docs/05-runbooks/local-dev.md)** — running the project locally.
