# From-scratch setup — provision everything yourself

> You just cloned the repo and have **no credentials**. This guide takes you
> from zero to a fully working local stack: your own Supabase project (with
> Google sign-in), database migrations, third-party keys, env files for all
> four apps, and seeded test data.
>
> Already have the team's credentials? You don't need this — go straight to
> [getting-started.md](getting-started.md). Deploy-time secret routing
> (Render/Vercel) lives in
> [../05-runbooks/env-and-secrets.md](../05-runbooks/env-and-secrets.md).

Prerequisites: Node ≥ 22 · pnpm 11 (`corepack enable`) · `pnpm install` done
(see [getting-started.md](getting-started.md) §1–2).

## 0. The two paths

| Path | What you need | Time |
| --- | --- | --- |
| **A — Frontend only, against the live API** | Nothing secret: point `NEXT_PUBLIC_API_BASE_URL` at the live Render API (default in the examples) and you can browse real data. Sign-in/booking needs the team's Supabase keys. | minutes |
| **B — Your own full stack** | Your own Supabase + Stripe test + Cloudinary + Resend accounts (all free tiers). This guide. | ~1 hour |

## 1. Supabase project (auth + database)

1. Create a project at <https://supabase.com/dashboard> (any region; the
   team's is Singapore). Save the **database password** you set — it goes into
   the connection strings.
2. Collect from **Project Settings → API**:
   - Project URL → `SUPABASE_URL` (API) and `NEXT_PUBLIC_SUPABASE_URL` /
     `EXPO_PUBLIC_SUPABASE_URL` (frontends)
   - `anon` key → `SUPABASE_ANON_KEY` + the frontend `*_ANON_KEY` vars
     (client-safe, published to browsers)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` — **server-only
     secret**, never ships to a frontend. The API uses it for exactly one
     thing: deleting a Supabase auth identity when an account is deleted.
3. Connection strings (**Connect** button on the dashboard):
   - `DATABASE_URL` = the **transaction pooler** URI (port **6543**) —
     append `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` = the **direct** URI (port **5432**) — used by
     migrations/seed/reset only
4. JWT verification is asymmetric via JWKS — set
   `SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`.
   Leave `SUPABASE_JWT_SECRET` empty (legacy HS256 fallback only; modern
   projects don't need it).
5. **Authentication → Sign In / Up → Email**: turn **email confirmation ON**
   (the web register flow assumes a confirm step).
6. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3001` (your web app in dev)
   - Redirect URLs: add `http://localhost:3001/auth/callback` (+ your
     deployed web origin later, e.g. `https://<your-web>.vercel.app/auth/callback`)

### 1a. Google sign-in (the only OAuth provider the web app wires)

The web login/register pages call
`supabase.auth.signInWithOAuth({ provider: 'google' })` and land on
`/auth/callback` — for that to work:

1. In [Google Cloud Console](https://console.cloud.google.com/) create (or
   pick) a project → **APIs & Services → OAuth consent screen**: External,
   fill the app name + your email, add yourself as a test user while in
   testing mode.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   type **Web application**:
   - Authorized JavaScript origins: `https://<ref>.supabase.co`
   - Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`
     (this exact Supabase URL — NOT your app's URL; Supabase brokers the
     handshake, then redirects to your app's `/auth/callback` from step 1.6)
3. Copy the **Client ID + Client secret** into Supabase → **Authentication →
   Sign In / Up → Auth Providers → Google** → enable + save.
4. Test: `pnpm nx dev @tourism/web` → <http://localhost:3001/login> →
   "Continue with Google". After the redirect you should land on `/account`
   (the callback exchanges the code for a session and syncs the user into the
   API's `users` table via `POST /auth/sync`).

Admin and mobile sign in with **email/password only** — no OAuth setup needed
for them.

## 2. Database schema (migrations)

```bash
cd apps/api
cp .env.example .env          # fill it as you go through this guide
pnpm exec prisma migrate deploy   # applies ALL migrations, in order
pnpm exec prisma generate
```

- Everything is inside the migrations — including the hardening pass
  (citext email, CHECK constraints, RLS on every table). Do **not** run
  `prisma/hardening.sql` manually; its header says so (reference copy only).
- Optional backstop: RLS on the `_prisma_migrations` bookkeeping table can't
  live in a Prisma migration; if you want it, run the one-liner from
  `hardening.sql`'s header in the Supabase SQL editor. Skipping it is safe —
  the API connects as the service role, which bypasses RLS anyway.

## 3. Third-party services

| Service | Vars | How to get them | Required at boot? |
| --- | --- | --- | --- |
| **Stripe** (test mode) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | [dashboard.stripe.com](https://dashboard.stripe.com) → test mode → Developers → API keys (`sk_test_...`). Webhook secret: for local testing run `stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook` and copy the printed `whsec_...`; any non-empty placeholder boots the API if you don't need payments yet. | **Yes** (both) |
| **PayPal** (sandbox) | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox`, `PAYPAL_WEBHOOK_ID` | [developer.paypal.com](https://developer.paypal.com) → sandbox app → client id + secret. ⚠️ **Required non-empty since API-W2** (an empty secret used to boot a silently broken gateway). `PAYPAL_WEBHOOK_ID` MAY stay blank in dev (no inbound webhooks locally — it only disables the webhook backstop). | **Yes** (id + secret) |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | [cloudinary.com](https://cloudinary.com) free account → Dashboard. | **Yes** (all 3) |
| **Resend** (email) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL` (optional) | [resend.com](https://resend.com) → API key. ⚠️ **Required at boot** even if you don't care about email — the API refuses to start with it empty; `RESEND_FROM_EMAIL` must look like an address or `Name <addr@domain.tld>` (format-validated). Without a **verified domain** sends will fail: outbox rows go `FAILED` and retry. That's expected and harmless in dev (a placeholder-shaped `re_...` value boots fine). `RESEND_REPLY_TO_EMAIL` = optional support inbox replies land in (blank = no Reply-To header). | **Yes** (key + from) |
| **Sentry** | `SENTRY_DSN` | Optional — leave `''`, telemetry is a no-op. | No |

Also in `apps/api/.env`:

- `ADMIN_EMAILS` — comma-separated allowlist. **Put your own email here**;
  it's what lets your account become ADMIN (§5).
- `CORS_ORIGINS=http://localhost:3001,http://localhost:3002` — required for
  the web/admin browsers to call the API.
- `FRONTEND_URL=http://localhost:3001` — Stripe success/cancel redirect base.

Boot check: `pnpm nx serve @tourism/api` — if any required var is missing,
Joi aborts startup and prints the **full list** of violations (fix them all
in one pass). Then hit <http://localhost:3000/api/v1/health> (expect
`{"status":"ok","db":"up"}`) and <http://localhost:3000/api/docs> (Swagger,
dev-only).

## 4. Frontend env files

Each app has its own example — copy and fill:

```bash
cp apps/web/.env.example    apps/web/.env      # Supabase URL/anon + API origin (+ NEXT_PUBLIC_SITE_URL)
cp apps/admin/.env.example  apps/admin/.env    # Supabase URL/anon + API origin
cp apps/mobile/.env.example apps/mobile/.env   # 4 EXPO_PUBLIC_* vars — ALL required, no defaults
```

- API base URLs are **origins without `/api/v1`** (the typed client appends
  it).
- Mobile on a physical device: `localhost` is the phone — use your PC's LAN
  IP or the live API.
- Port map: API :3000 · web :3001 · admin :3002 (`pnpm nx dev @tourism/web`,
  `pnpm nx dev @tourism/admin`).

## 5. Accounts: how login actually works

The API **mirrors** Supabase users into its own `users` table on
`POST /auth/sync` — so an account only "exists" after the first sign-in.

- **Customer:** register on the web app (<http://localhost:3001/register> or
  Google). Done.
- **Admin:** register a Supabase account whose email is in `ADMIN_EMAILS`,
  then sign in at <http://localhost:3002> — the admin app calls
  `POST /auth/admin/sync`, which force-elevates allowlisted emails to ADMIN.
  Any other email gets `403 NOT_ADMIN` and is signed back out.

## 6. Seed data (catalog + test rows)

With the schema migrated and `DIRECT_URL` set:

```bash
pnpm nx run @tourism/api:seed
```

⚠️ It writes to whatever database `DIRECT_URL` points at — double-check you
are on YOUR project, not the shared dev DB. What it creates (idempotent —
safe to re-run):

1. **The full catalog**: destinations, categories, tours (+ itinerary/FAQs/
   policies/departures), posts, reviews, enquiries, media rows — from the
   committed fixtures (`apps/api/prisma/fixtures/`).
2. **Two login-able overlay rows**: a customer `customer@tourism.test` and an
   admin using the **first entry of your `ADMIN_EMAILS`**. These are **local
   rows only, NOT Supabase auth accounts** — to actually log in, register
   real Supabase accounts with those exact emails (web register for the
   customer; §5 for the admin). The first `/auth/sync` relinks the seeded row
   to your real Supabase identity by email, keeping its history.
3. **A pre-paid booking `BK-SEEDPAID`** on an open departure (2 adults,
   `PAID`, seats claimed, fake Stripe ids) — so "My bookings", reviews and
   the refund flow are exercisable without a real payment. Admin-refunding it
   fails with `REFUND_FAILED` by design (the payment intent is fake).
4. `apps/api/.env.e2e` (gitignored) — ids/emails/codes the e2e suite reads.

To start over: `pnpm nx run @tourism/api:reset` — TRUNCATEs all 25 app tables
(⚠️ destructive), then re-run the seed. Supabase **auth accounts survive** a
reset (they live in Supabase's own `auth` schema); their local mirror rows are
recreated on the next sign-in.

**Known cosmetic gap on a fresh Cloudinary account:** the fixture media rows
reference Cloudinary `publicId`s from the team's account, so images may 404
in your stack. Everything else works; replace imagery by uploading through
the admin (tour/destination forms or `/media`) — uploads go to YOUR
Cloudinary and the rows update.

## 7. Verify the whole loop

1. `pnpm nx serve @tourism/api` → health OK (§3).
2. `pnpm nx dev @tourism/web` → <http://localhost:3001> shows the seeded
   catalog; register + confirm email; Google button works (§1a).
3. `pnpm nx dev @tourism/admin` → sign in with your `ADMIN_EMAILS` account →
   dashboard shows seeded stats.
4. Booking money-path (optional): Stripe test card `4242 4242 4242 4242` on
   a tour's Book now flow — with `stripe listen` running, the webhook flips
   the booking to `PAID`.
5. Full gate: `pnpm nx run-many -t lint typecheck test build`.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| API exits at boot listing env violations | Fill every var Joi names — the list is complete, one pass fixes it. |
| `401 USER_NOT_SYNCED` | Signed in but never hit `/auth/sync` — the FE does it automatically on sign-in; check `NEXT_PUBLIC_API_BASE_URL` + `CORS_ORIGINS`. |
| `403 NOT_ADMIN` on admin login | Email not in the API's `ADMIN_EMAILS` (comma-separated, case-insensitive) — edit `apps/api/.env`, restart the API. |
| Browser CORS errors | Add the frontend origin to `CORS_ORIGINS` (empty value reflects any origin in dev, but a populated list must include :3001/:3002). |
| Images 404 | Fresh Cloudinary account — see §6. |
| Outbox rows `FAILED` | Resend key is a placeholder / domain unverified — expected in dev; rows retry and park FAILED. |
| Web sections render empty | No API reachable — by design; point `NEXT_PUBLIC_API_BASE_URL` at a running API. |
