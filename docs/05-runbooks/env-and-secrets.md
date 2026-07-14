# Runbook — Environment variables & secrets

> This covers **where deploy-time secrets go** (Render/Vercel). To *obtain*
> the values from scratch (own Supabase project incl. Google OAuth,
> Stripe/Cloudinary/Resend), see
> [../04-guides/from-scratch-setup.md](../04-guides/from-scratch-setup.md).
>
> How to load config into the deployed apps **fast** without leaking secrets.
> This repo is **public** — committing a real secret leaks it within minutes. Keep every value
> with a real secret **local-only** (the `.gitignore` already ignores `.env` + `.env.*`, tracking
> only `*.env.example`). This file is committed because it contains **no values**.

## Golden rules

1. **Never commit a filled `.env`.** Only `*.env.example` (keys, blank values) is tracked.
2. **One file per target.** API secrets go to **Render**; the web/admin apps only take
   `NEXT_PUBLIC_*` and go to **Vercel**. Don't put server secrets in a Next.js app — anything
   `NEXT_PUBLIC_*` is shipped to the browser.
3. **Test vs live are different secrets.** The Stripe/PayPal values below are currently **sandbox**
   keys on the live hosts (fine for demo). Going live means swapping in **live** keys + a **live**
   webhook endpoint — a second variant of the same keys, not a new variable.

## Where each variable goes

### API → Render (service `tourism-api`)

| Variable | Secret? | Notes |
| --- | --- | --- |
| `NODE_ENV`, `PORT`, `API_PREFIX`, `LOG_LEVEL` | no | runtime config |
| `CORS_ORIGINS` | no | comma-sep origins (no trailing slash) — the two `*.vercel.app` + `https://www.nexora-travel.agency` + `https://admin.nexora-travel.agency` |
| `FRONTEND_URL` | no | **required at boot (Joi)** — the web origin (`https://www.nexora-travel.agency`); payment return URLs are built from it |
| `DATABASE_URL`, `DIRECT_URL` | **yes** | Supabase Postgres (pooled / direct) — contain the DB password |
| `SUPABASE_URL`, `SUPABASE_JWKS_URL` | no | project URLs |
| `SUPABASE_ANON_KEY` | low | client-safe key (server uses it too) |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes (critical)** | full DB bypass — never expose |
| `SUPABASE_JWT_SECRET` | **yes** | verifies customer/admin JWTs |
| `ADMIN_EMAILS` | low | allowlist for `/auth/admin/sync` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_FOLDER` | no | media config |
| `CLOUDINARY_API_KEY` | low | |
| `CLOUDINARY_API_SECRET` | **yes** | signs uploads |
| `STRIPE_SECRET_KEY` | **yes** | `sk_test_…` (sandbox) / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | **yes** | `whsec_…` from the Stripe **webhook endpoint** — see gotcha below |
| `STRIPE_DEFAULT_CURRENCY` | no | e.g. `usd` |
| `PAYPAL_CLIENT_ID` | low | |
| `PAYPAL_CLIENT_SECRET` | **yes** | |
| `PAYPAL_MODE` | no | `sandbox` / `live` |
| `PAYPAL_WEBHOOK_ID` | low | from the PayPal app webhook |
| `RESEND_API_KEY` | **yes** | transactional email — a real "Sending access" key since 2026-07-13 (domain verified) |
| `RESEND_FROM_EMAIL` | no | verified sender: `Nexora <noreply@nexora-travel.agency>` (format-validated at boot) |
| `RESEND_REPLY_TO_EMAIL` | no | optional support inbox replies land in (blank = no Reply-To; replies to `noreply@` bounce) |
| `SENTRY_DSN` | low | error reporting (optional) |
| `THROTTLE_TTL_SECONDS`, `THROTTLE_LIMIT` | no | rate-limit config |
| `ANTHROPIC_API_KEY` | **yes** | AI concierge chat (console.anthropic.com) — **optional**: unset ⇒ chat endpoint answers 503 `CHAT_UNAVAILABLE`, rest of the API unaffected |
| `CHAT_MODEL` | no | optional, default `claude-haiku-4-5` — provider/model swap point (AI SDK) |

### Web + Admin → Vercel (projects `tourism-platform-web`, admin)

| Variable | Secret? | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | no | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | client-safe by design |
| `NEXT_PUBLIC_API_BASE_URL` | no | API origin **without** `/api/v1` (the client adds it) — e.g. `https://tourism-api-pqwr.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | no | **web only** — canonical origin for sitemap/robots/OG: `https://www.nexora-travel.agency` |
| `NEXT_PUBLIC_CHAT_WHATSAPP` | no | **web only, optional** — WhatsApp number for the contact launcher, international digits (no `+`), e.g. `84912345678`; the channel hides itself while unset |

## Fast loading (bulk, no typing each var)

**Local source of truth.** Per app, copy the example and fill it once — this stays on your machine
(gitignored):

```bash
cp apps/api/.env.example   apps/api/.env.production.local
cp apps/web/.env.example   apps/web/.env.production.local
cp apps/admin/.env.example apps/admin/.env.production.local
```

**Render (API).** Dashboard → `tourism-api` → **Environment** → **Add from .env** → paste the whole
`apps/api/.env.production.local` body (`KEY=VALUE` lines) → **Save Changes** (auto-redeploys, ~5–8 min).
For values shared across services, define them once in a Render **Environment Group** and link it.

**Vercel (web/admin).** Either bulk-paste in **Project → Settings → Environment Variables**, or with the
CLI:

```bash
vercel link                       # once per project
vercel env pull .env.local        # pull existing (sync down)
# add/update: vercel env add NEXT_PUBLIC_API_BASE_URL production
```

## Gotcha that bit us (Stripe webhook)

Checkout can succeed with only `STRIPE_SECRET_KEY` set, but the booking only flips **PENDING → PAID**
when Stripe's `checkout.session.completed` **webhook** reaches the API and its signature verifies. So:

- Register the endpoint in **Stripe → Webhooks**: `https://<api-host>/api/v1/payments/stripe/webhook`
  listening to `checkout.session.completed` (+ `checkout.session.expired`).
- Copy that endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET` on Render (must match, per
  environment — test endpoint → test secret).
- A payment made **before** the endpoint existed won't auto-flip — resend the event from the webhook's
  event log, or just make a fresh booking.
