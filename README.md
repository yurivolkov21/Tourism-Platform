# tourism-platform

An **Nx 22 + pnpm** monorepo for a Lily-style tourism booking platform — mobile from day one. The
backend (NestJS + Prisma + Supabase) is complete; web/admin/mobile front-ends are next.

| Project | Path | Stack | Status |
| --- | --- | --- | --- |
| `@tourism/api` | `apps/api` | NestJS 11 · Prisma 7 · Supabase · Stripe + PayPal · Cloudinary · Resend · pg-boss | ✅ P1 complete |
| `@tourism/web` | `apps/web` | Next.js 16 | 🚧 scaffold |
| `@tourism/admin` | `apps/admin` | Next.js 16 | 🚧 scaffold |
| `@tourism/mobile` | `apps/mobile` | Expo SDK 54 / RN | 🚧 scaffold |
| `@tourism/core` · `tokens` · `i18n` · `web/ui` · `mobile/ui` | `libs/` | shared types/client · design tokens · EN copy · UI | 🚧 scaffold |

Full docs: **[docs/README.md](docs/README.md)** (map + reading path) · the operating contract:
**[CLAUDE.md](CLAUDE.md)**.

---

## 🇻🇳 Bắt đầu nhanh (Tiếng Việt)

> Tóm tắt cho cả nhóm. Chi tiết đầy đủ ở phần **Getting started** (English) bên dưới + runbook
> **[docs/runbooks/local-dev.md](docs/runbooks/local-dev.md)**.

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
`build`. Test API bằng tay: xem **[apps/api/postman/README.md](apps/api/postman/README.md)**. Danh mục
function (tiếng Việt): **[admin](docs/reference/functions-admin.md)** · **[customer](docs/reference/functions-customer.md)** · **[system](docs/reference/functions-system.md)**.

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
> **[docs/runbooks/local-dev.md](docs/runbooks/local-dev.md)**.

## Test data: from zero vs seeded

- **From zero (recommended for understanding the API)** — `pnpm nx run @tourism/api:reset` empties all
  app tables (keeps schema + your Supabase accounts). Then build every row yourself through the API; the
  **[Postman collection](apps/api/postman/README.md)** walks you through it (admin creates the catalog →
  customer books it).
- **Seeded (quick demo data)** — `pnpm nx run @tourism/api:seed` loads a demo catalog + a self-signed
  PAID booking (this is what e2e/CI use).

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
docs/   README.md (map) · BLUEPRINT.md · roadmap.md · architecture/ · decisions/ (ADRs) ·
        guides/ · runbooks/ · reference/ (function catalog) · specs/ · plans/
```

## Where to read next

- **[docs/README.md](docs/README.md)** — documentation map + reading path.
- **[docs/roadmap.md](docs/roadmap.md)** — phases P0–P6 + status.
- **[docs/reference/functions-admin.md](docs/reference/functions-admin.md)** · **[customer](docs/reference/functions-customer.md)** · **[system](docs/reference/functions-system.md)** — every backend function.
- **[apps/api/postman/README.md](apps/api/postman/README.md)** — manual API testing.
- **[docs/runbooks/local-dev.md](docs/runbooks/local-dev.md)** — running the project locally.
