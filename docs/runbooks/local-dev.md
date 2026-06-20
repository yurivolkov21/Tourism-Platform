# Runbook — local development

How to install, run, and test `@tourism/api` locally — and the **Nx command mapping** if you're used to
plain NestJS (`pnpm start:dev`). Front-end apps (web/admin/mobile) land in P2+.

> Quick start lives in the root **[README.md](../../README.md)**; this is the deeper reference.

## Mental model: Nx wraps each project

You don't `cd` into a project and run an npm script. You run, **from the repo root**:

```bash
pnpm nx <target> <project>
```

- `<project>` = the package name, e.g. **`@tourism/api`**.
- `<target>` = the task: `serve`, `build`, `test`, `lint`, `typecheck`…
- `pnpm` at the front uses the repo-local `nx` (not a global one).

Two equivalent syntaxes: `pnpm nx serve @tourism/api` ⟺ `pnpm nx run @tourism/api:serve`. Custom targets
(`seed`, `reset`, `e2e`) are usually written the long way: `pnpm nx run @tourism/api:seed`.

## Coming from NestJS? Command mapping

| Used to (NestJS) | Here (Nx) | Notes |
| --- | --- | --- |
| `pnpm start:dev` (`nest start --watch`) | **`pnpm nx serve @tourism/api`** | dev + watch + auto-restart; runs from repo root |
| `pnpm start:prod` / `node dist/main` | `pnpm nx build @tourism/api` → `node apps/api/dist/main.js` | build output is `apps/api/dist/main.js` |
| `pnpm test` | `pnpm nx test @tourism/api` | Jest |
| `pnpm test:e2e` | `pnpm nx run @tourism/api:e2e` | needs a **seeded** DB first |
| `pnpm lint` | `pnpm nx lint @tourism/api` | |
| (type-check) | `pnpm nx typecheck @tourism/api` | |
| `prisma migrate` / `generate` | `cd apps/api && pnpm exec prisma migrate deploy` | Prisma runs as before, inside `apps/api` |

## First-time setup (after clone)

```bash
corepack enable                                   # pinned pnpm
pnpm install                                      # all workspace deps
# create apps/api/.env (see root README for the required keys)
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma generate && cd ../..
```

## Running the API

```bash
pnpm nx serve @tourism/api
```

- Boots from the repo root → `🚀 Tourism API on http://localhost:3000/api/v1` (Swagger at `/api/docs`).
- **Watch mode:** edit code → Nx rebuilds + restarts automatically.
- **Stop:** `Ctrl + C`.
- It watches **code**, not the DB — after a schema change, re-run `prisma migrate deploy` + `prisma generate`.
- One-shot alternative (no watch): `pnpm nx build @tourism/api && (cd apps/api && node dist/main.js)` —
  run the built file **from `apps/api/`** so dotenv resolves `.env`.

## Test data

| Goal | Command | Effect |
| --- | --- | --- |
| **Start from zero** | `pnpm nx run @tourism/api:reset` | TRUNCATEs all 17 app tables. Keeps the schema/RLS, the pg-boss queue, and your **Supabase Auth accounts** (logins survive). Build rows yourself via the API. |
| **Quick demo data** | `pnpm nx run @tourism/api:seed` | Loads a demo catalog (categories/destinations/tours/departures + media) + a self-signed PAID booking. Used by **e2e/CI**. |

Manual API testing (incl. creating the Supabase users + a from-zero walkthrough):
**[apps/api/postman/README.md](../../apps/api/postman/README.md)**.

## Useful Nx commands

```bash
pnpm nx run-many -t lint typecheck test build       # the full quality gate (all projects)
pnpm nx affected -t test                            # only what changed since main
pnpm nx show project @tourism/api                   # list every target a project has
pnpm nx graph                                       # project dependency graph (opens a browser)
pnpm nx reset                                        # clear the Nx cache if a task acts stale
```

## Gotchas

- **Run the built file from `apps/api/`** (`cd apps/api && node dist/main.js`), not the repo root —
  `main.ts` resolves `.env` relative to the cwd. `pnpm nx serve` handles this for you; the raw
  `node dist/main.js` doesn't.
- **Migrations + seed target `DIRECT_URL`** (Supabase direct, port 5432); the app runtime uses
  `DATABASE_URL` (the pooler) via the `PrismaPg` adapter.
- **pg-boss jobs** are disabled when `NODE_ENV=test` or `RESEND_API_KEY` is unset, so unit/e2e don't
  start the worker.
- **TS6305 flood on typecheck** = stale buildinfo → `cd apps/api && rm -rf dist && pnpm exec tsc -b
  tsconfig.json --emitDeclarationOnly --force`.
