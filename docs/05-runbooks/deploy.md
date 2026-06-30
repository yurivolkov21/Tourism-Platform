# Runbook — Deploy (free tier, for the end-of-semester demo)

> **Goal:** get the platform online for $0 until the project passes, then upgrade
> to paid with no code change. **Architecture:** Vercel (web + admin) · Render
> (API) · Supabase (Postgres + auth). **Decided in:** session 2026-06-24.
>
> **Why Render and not Vercel for the API:** the NestJS API runs pg-boss jobs
> **in-process** (outbox 1m · booking-cleanup 15m · media-reconcile daily) →
> needs an always-running process. Serverless (Vercel Functions) would break the
> jobs. → a persistent web service on Render.

## 0. The free-tier catch (and how we handle it)

| Limit (verified) | Effect | Mitigation |
| --- | --- | --- |
| Render Free spins down after **15 min idle** (~1 min cold start) | pg-boss jobs pause while asleep | **Keep-alive pinger** hits `/health` every 10 min (§3) |
| Render Free: **750 instance-hours/month** (sleeping hrs don't count) | 24/7 awake ≈ 744h (tight) | One always-on service ≈744h fits under 750; the cron-job.org ping (every 10 min, §3) keeps it warm |
| Supabase Free **pauses after ~7 days idle** | DB unreachable → app down | `/health` runs `SELECT 1` → the ping keeps the DB active too |
| Cold start on a truly-idle hit | first request ~1 min | pinger keeps it warm; during a live demo, your own traffic keeps it warm |

pg-boss jobs are **persisted in Postgres** → a spin-down only *delays* them; on wake they catch up. No data loss.

## 1. Supabase — PROD project (separate from dev)

1. Create a **new** Supabase project (don't reuse the dev project). Pick the Singapore region.
2. **Connection strings** (Project → Settings → Database):
   - `DATABASE_URL` = the **transaction pooler** URI (port `6543`), append `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL` = the **direct** URI (port `5432`) — used by `prisma migrate deploy`.
3. **Auth keys** (Project → Settings → API): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and `SUPABASE_JWKS_URL` (`<url>/auth/v1/.well-known/jwks.json`).
4. **Run migrations** against prod (from your machine, env pointed at prod `DIRECT_URL`):

   ```bash
   DIRECT_URL="<prod direct url>" pnpm exec prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```

5. **Create the admin user:** Supabase → Authentication → Users → Add user (email = one of `ADMIN_EMAILS`, set a password). The API mirrors + elevates on first `POST /auth/admin/sync`. (The repo `seed` only mirrors a local row — it does NOT create the Supabase auth user.)
6. *(Optional)* seed catalog data: point `DATABASE_URL`/`DIRECT_URL` at prod and run `pnpm nx run @tourism/api:seed`.

## 2. Render — the API (via Blueprint)

1. Render Dashboard → **Blueprints** → **New Blueprint Instance** → connect this repo. It reads [`render.yaml`](../../render.yaml) and creates a free web service `tourism-api`.
   - Build: `pnpm install` → `prisma generate` → `nx build @tourism/api`. Start: `node apps/api/dist/main.js`. Health check: `/api/v1/health`.
2. **Set the `sync: false` env vars** in the service's Environment tab (values from §1 + your Stripe/PayPal/Resend/Cloudinary keys). Leave `PORT` unset (Render injects it).
   - ⚠️ **`FRONTEND_URL` is REQUIRED at boot** (Joi validation) and must be a valid URL — set it now to your planned web domain (e.g. `https://tourism-web.vercel.app`) or any temporary `https://…`; refine in §5. `CORS_ORIGINS` *is* optional (blank = reflect any origin) — fine to leave blank until §5.
   - `NODE_ENV=production`, `PAYPAL_MODE=sandbox` (until you have live PayPal), `STRIPE_DEFAULT_CURRENCY=USD`.
3. Deploy. When live, note the URL: `https://tourism-api-XXXX.onrender.com`. Verify:

   ```bash
   curl https://tourism-api-XXXX.onrender.com/api/v1/health   # → {"data":{"status":"ok","db":"up",...}}
   ```

   (Swagger UI is disabled in production by design.)

## 3. Keep-alive pinger

**Active: cron-job.org** (what's actually running). Free account → new cron job → URL = the `/health` URL
(`https://tourism-api-XXXX.onrender.com/api/v1/health`) → interval **10 min** → done. Rock-solid for the
demo. Caveat: cron-job.org **auto-disables a job after 25 consecutive failures** (30s timeout each) — if
Render is down for a long stretch, re-enable the job manually. (UptimeRobot 5-min free works too.)

> **No in-repo workflow.** There is intentionally **no** `.github/workflows/keepalive.yml` — only `ci.yml`
> exists. If you ever want the ping committed to the repo instead, add a scheduled GitHub Actions workflow
> hitting `API_HEALTH_URL` every 10 min (note: GitHub-scheduled runs are best-effort and auto-disable after
> 60 days of repo inactivity), but cron-job.org is the chosen mechanism.

## 4. Vercel — web + admin (two projects, same repo)

For **each** app (`apps/web`, `apps/admin`) create a Vercel project from this repo:

- **Root Directory:** `apps/web` (resp. `apps/admin`). Framework preset: Next.js.
- **Build command:** `pnpm nx build @tourism/web` (resp. `@tourism/admin`). **Install:** `pnpm install`. Output is auto-detected (`.next`).
- **Environment variables** — ⚠️ `NEXT_PUBLIC_API_BASE_URL` is the API **ORIGIN, with NO `/api/v1`**
  (the typed `@tourism/core` client already adds the `/api/v1` prefix; appending it doubles the path):
  - web: `NEXT_PUBLIC_API_BASE_URL=https://tourism-api-XXXX.onrender.com` (+ Supabase public keys when web auth lands).
  - admin: `NEXT_PUBLIC_API_BASE_URL=https://tourism-api-XXXX.onrender.com`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the **prod** Supabase project's public values).
- Deploy → note the domains, e.g. `tourism-web.vercel.app`, `tourism-admin.vercel.app`.

## 5. Wire CORS (close the loop)

Back on Render, set:

- `CORS_ORIGINS` = `https://tourism-web.vercel.app,https://tourism-admin.vercel.app` (comma-separated, no trailing slash).
- `FRONTEND_URL` = `https://tourism-web.vercel.app`.

Redeploy the API (or it picks up env on next deploy). Sign in to the admin at `https://tourism-admin.vercel.app/login` with the §1.5 admin user.

## 6. Verify checklist

- [ ] `GET /api/v1/health` → 200 `db: up`
- [ ] Admin login works (admin user + `ADMIN_EMAILS` match)
- [ ] Admin CRUD reads/writes against prod data
- [ ] Pinger green (Actions tab / cron-job.org log); service stays warm
- [ ] No CORS errors in the browser console on the Vercel domains

## 7. Demo-day fallback (zero cold-start, zero cost)

If you want **no** cloud risk during the presentation: run the API locally and expose it via **Cloudflare Tunnel** (free, stable named URL):

```bash
pnpm nx serve @tourism/api            # local API on :3000 (jobs run, no spin-down)
cloudflared tunnel --url http://localhost:3000   # prints a public https URL
```

Point the Vercel `NEXT_PUBLIC_API_BASE_URL` at the tunnel URL for the demo. Trade-off: your laptop + network must stay up during the demo.

## 8. Upgrade to paid (after passing — no code change)

- **Render:** switch the service from Free → **Starter ($7/mo)** → no spin-down; delete the pinger. *(Done.)*
- Or move the API to **Railway** (always-on by default, usage-based) — same build/start commands.
- Switch `PAYPAL_MODE` → `live` and swap Stripe/PayPal keys to live when taking real payments.

## Gotchas

- **Prisma pooler:** keep `connection_limit=1` on the pooled `DATABASE_URL`; `migrate deploy` must use `DIRECT_URL` (5432).
- **Build externalizes deps** (`apps/api/webpack.config.js`) → the full `pnpm install` at build time is required so `node_modules` exist at runtime; `prisma generate` builds the Linux query engine on Render.
- **Migrations:** run `prisma migrate deploy` (never `migrate dev`) against prod; review before applying.
- **Secrets:** all real values live in the platform dashboards (`sync: false` in `render.yaml`) — never commit them.
