# Postman — manual API testing

Two files for driving `@tourism/api` by hand in Postman:

- **`tourism-api.postman_collection.json`** — the collection (63 requests).
- **`tourism-local.postman_environment.json`** — the environment (fill the secrets).

Two flows, split by folder, each with sub-folders per area:

```
CUSTOMER   → 00 Auth & Account · 01 Catalog (Public) · 02 Booking & Payment · 03 Reviews & Wishlist · 04 Enquiry (Public)
ADMIN      → 00 Auth & Stats · 01 Tours · 02 Categories · 03 Destinations · 04 Departures · 05 Media Uploads · 06 Reviews Moderation · 07 Enquiries · 08 Bookings
_WEBHOOKS  → reference only (need provider signatures)
```

## Auth model (real Supabase login)

Each flow's **`00 · Auth`** folder has a **Login** request that calls Supabase GoTrue
(`POST {{supabaseUrl}}/auth/v1/token?grant_type=password`) and captures the `access_token` into
`{{customerToken}}` / `{{adminToken}}`. Every other request in that flow inherits
`Authorization: Bearer {{token}}` automatically (public sub-folders override to No Auth).

Because the token carries a **real** Supabase `sub`, you must run **`/auth/sync`** (customer) /
**`/auth/admin/sync`** (admin) once after logging in — that mirrors the identity into the API's local
`users` table so the rest of the endpoints can resolve you.

## Prerequisites

1. **Seed the DB**, then **run the API** (dev/watch mode — the `start:dev` equivalent):
   ```bash
   pnpm nx run @tourism/api:seed      # catalog + a PAID booking (BK-SEEDPAID)
   pnpm nx serve @tourism/api         # watch + auto-restart; runs from repo root → http://localhost:3000
   ```
   `nx serve` is the recommended dev command (build + run + watch). Alternative one-shot:
   `pnpm nx build @tourism/api && (cd apps/api && node dist/main.js)`.
2. **Two Supabase Auth users** must exist with the passwords you put in the env:
   `customer@tourism.test` and an admin whose email is in **`ADMIN_EMAILS`**. Create / reset them with
   the **`_SETUP (Admin API)`** folder (below) — no dashboard needed.

## Setup (once)

1. Import both files into Postman.
2. Select the **Tourism — Local** environment and fill:

   | Variable | Where to get it |
   | --- | --- |
   | `supabaseUrl` | `apps/api/.env` → `SUPABASE_URL` |
   | `supabaseAnonKey` | `apps/api/.env` → `SUPABASE_ANON_KEY` |
   | `supabaseServiceRoleKey` | `apps/api/.env` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ bypasses RLS — never commit/share) |
   | `customerEmail` / `customerPassword` | pick a password; the `_SETUP` folder pushes it to Supabase |
   | `adminEmail` / `adminPassword` | admin email **must be ∈ `ADMIN_EMAILS`**; pick a password |

   `baseUrl` is pre-filled (`http://localhost:3000/api/v1`).
3. Run **`_SETUP (Admin API · run once)`** to create/confirm the two users with your env passwords:
   - **Forgot the password** on existing users → run **1** (find ids), then **3** + **5** (set passwords).
   - **First time** (no users) → run **2** + **4** (creates them already-confirmed).

   This uses the **service_role** key to set passwords + `email_confirm` directly (no email step), so
   `Login` then works with the same env passwords.

## Suggested run order

0. **`_SETUP (Admin API)`** — once, to set the user passwords (see Setup step 3 above).
1. **CUSTOMER → 00 · Auth** — `Login` → `Sync local user` → `GET /users/me`.
2. **CUSTOMER → 01 · Catalog** — run the GETs; they auto-capture `{{tourSlug}}`, `{{tourId}}`,
   `{{categorySlug}}`, `{{destinationSlug}}`, `{{departureId}}` for everything downstream.
3. **CUSTOMER → 02/03/04** — booking, reviews/wishlist, enquiry.
4. **ADMIN → 00 · Auth** — `Login` → `admin/sync` → `stats/dashboard`.
5. **ADMIN → 01…08** — CRUD + moderation + CRM + refund.

Requests that create something capture the new id/slug into a `new*` variable (e.g. `{{newTourSlug}}`),
so the GET/PATCH/DELETE that follow just work without copy-paste.

## Caveats (read once)

- **Reviews need a PAID booking *you* own.** The seeded `BK-SEEDPAID` belongs to the seed customer, not
  your Supabase-login user — so `POST /reviews` against it returns 403/400. To test the happy path,
  create a booking, complete checkout/payment, let the webhook flip it to PAID, then review it.
- **Media `publicId`s must be real Cloudinary ids.** `PUT …/media` and `PUT /users/me/avatar` reference
  Cloudinary `public_id`s — mint a signed URL via **ADMIN → 05 · Media Uploads** and upload first, or
  the asset won't resolve.
- **Webhooks can't be called by hand** — they verify a provider signature over the raw body. Use the
  Stripe CLI (`stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook`) or the PayPal
  sandbox simulator. The `_WEBHOOKS` folder documents the endpoints only.
- **Admin refund** (`BK-SEEDPAID`) exercises the route + atomic seat-release; the seeded booking has no
  real provider charge, so the provider-side refund call may error in a live env (the route still runs).

## Negative cases included

A few `❌`-prefixed requests assert the guardrails: `401` (no token), `403` (customer hitting an admin
route), `404` (unknown slug/booking). Each has a `pm.test` so green/red shows in the Postman runner.
