# Getting started (new contributor)

You just cloned the repo. This is the **one page** that takes you from clone → running every app →
real data → testing. Backend deep-dive: [05-runbooks/local-dev.md](../05-runbooks/local-dev.md).
The 30-second version (Vietnamese) is the **"Bắt đầu nhanh"** box in the root [README](../../README.md).

## 0. What's here

A single **Nx 22 + pnpm** monorepo. You run tasks from the **repo root** with
`pnpm nx <target> <project>` — never `cd` into an app to run an npm script.

| App | Package | Dev URL | Needs |
| --- | --- | --- | --- |
| API (NestJS) | `@tourism/api` | `http://localhost:3000/api/v1` | a Supabase DB + service keys |
| Web (customer) | `@tourism/web` | `http://localhost:3001` | just an API origin (or the live one) |
| Admin (dashboard) | `@tourism/admin` | `http://localhost:3002` | Supabase public keys + an allowlisted email |
| Mobile (Expo) | `@tourism/mobile` | — | scaffold only (P5) |

You can run **any app on its own** — e.g. the web UI against the live API, with no local backend.

## 1. Prerequisites

- **Node ≥ 22** and **pnpm 11** via Corepack: `corepack enable`.
- For the **API**: a **Supabase** project + service secrets (Stripe/PayPal/Cloudinary/Resend test keys).
  Ask a maintainer for a ready `.env`, or use your own Supabase.

## 2. Install (once)

```bash
corepack enable
pnpm install          # installs every app + lib in the workspace
```

## 3. Pick what you want to run

### A) Just the web UI (fastest — no backend)

```bash
cp apps/web/.env.example apps/web/.env
# edit apps/web/.env → NEXT_PUBLIC_API_BASE_URL=https://tourism-api-pqwr.onrender.com   (the live API)
pnpm nx dev @tourism/web          # → http://localhost:3001
```

> With **no** API reachable, data-fed sections (featured tours, "Explore by destination"…) render
> **empty by design** — the page hides them instead of breaking. Point the var at the live Render API
> above (or your local one) to see real data. This is the #1 "is it broken?" gotcha — it isn't.

### B) The full backend

```bash
cp apps/api/.env.example apps/api/.env     # fill DATABASE_URL, DIRECT_URL, SUPABASE_*, ADMIN_EMAILS, …
                                           # (Joi fails fast at boot if a required key is missing)
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma generate && cd ../..
pnpm nx serve @tourism/api                 # → http://localhost:3000/api/v1  ·  Swagger: /api/docs

# load demo data (catalog + a PAID booking) OR start empty:
pnpm nx run @tourism/api:seed              # demo data
pnpm nx run @tourism/api:reset             # empty all tables (keeps schema + Supabase accounts)
```

### C) The admin dashboard

```bash
cp apps/admin/.env.example apps/admin/.env  # NEXT_PUBLIC_SUPABASE_URL/ANON_KEY + NEXT_PUBLIC_API_BASE_URL
pnpm nx dev @tourism/admin                  # → http://localhost:3002
```

To sign in: your email must be in the API's **`ADMIN_EMAILS`** and `http://localhost:3002` must be in its
**`CORS_ORIGINS`** (both in `apps/api/.env`). Point admin at a running API (local `:3000` or live).

## 4. Env files — where & what

Each app has a committed **`.env.example`**; copy it to `.env` (gitignored) and fill it. Never commit `.env`.

| File | Key values |
| --- | --- |
| `apps/api/.env` | `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `ADMIN_EMAILS`, `STRIPE_*`, `PAYPAL_*`, `CLOUDINARY_*`, `RESEND_*`, `FRONTEND_URL`, `CORS_ORIGINS` |
| `apps/web/.env` | `NEXT_PUBLIC_API_BASE_URL` (API **origin**, no `/api/v1`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (customer auth), `NEXT_PUBLIC_SITE_URL` *(optional — canonical origin for SEO sitemap/robots/OG; falls back to the Vercel production URL, then `localhost:3001`)* |
| `apps/admin/.env` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE_URL` |

## 5. Test it

- **API by hand:** [apps/api/postman/README.md](../../apps/api/postman/README.md) — import the collection +
  an environment (local or cloud/Render), then run admin-builds-catalog → customer-books-it.
- **Quality gate (what CI runs):** `pnpm nx run-many -t lint typecheck test build`
  (or only what changed: `pnpm nx affected -t lint typecheck test build`).
- **Preview the web app exactly as production serves it:**
  `pnpm nx build @tourism/web && pnpm exec next start apps/web --port 3001`.

## 6. Gotchas a newcomer hits

- **Run from the repo root.** `pnpm nx serve @tourism/api` — no `cd`. (`pnpm` uses the repo-local Nx.)
- **`NEXT_PUBLIC_API_BASE_URL` is an origin** — the typed client adds `/api/v1` itself. Don't double it.
- **Web dev uses `--webpack`** (Turbopack dev leaked memory / froze Windows). Prod build still uses
  Turbopack. Details + the Windows RAM/Defender fix: [local-dev.md](../05-runbooks/local-dev.md#web-dev-server-eats-ram--freezes-the-machine-windows--known-issue).
- **No raw hex colours** — styling uses `@tourism/tokens`; `pnpm check:no-hex` enforces it.
- **Conventions** (branching, commits, reuse-first): [04-guides/conventions.md](conventions.md).

## Where to go next

- **[docs/README.md](../README.md)** — full documentation map + reading path.
- **[docs/roadmap.md](../roadmap.md)** — phases P0–P6 + current status.
- **[CLAUDE.md](../../CLAUDE.md)** — the short operating contract.
