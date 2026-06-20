# Postman — manual API testing

Two files for driving `@tourism/api` by hand in Postman, **designed to test from an empty DB**:

- **`tourism-api.postman_collection.json`** — the collection (67 requests).
- **`tourism-local.postman_environment.json`** — the environment (fill the secrets).

**Run top-to-bottom** — each step builds the data the next one needs, so you always know where every
row came from (no seed dependency):

```
_SETUP    → create/confirm the customer + admin Supabase users (run once)
ADMIN     → 00 Auth & Stats · 01 Categories · 02 Destinations · 03 Tours · 04 Departures ·
            05 Media Uploads · 06 Reviews Moderation · 07 Enquiries · 08 Bookings   ← builds the catalog
CUSTOMER  → 00 Auth & Account · 01 Catalog (Public) · 02 Booking & Payment · 03 Reviews & Wishlist · 04 Enquiry   ← books what admin made
_WEBHOOKS → reference only (need provider signatures)
```

> **Start from zero** anytime with `pnpm nx run @tourism/api:reset` (truncates all app tables; keeps the
> schema + your Supabase accounts). Then run ADMIN → CUSTOMER to rebuild every row yourself.

## Auth model (real Supabase login)

Each flow's **`00 · Auth`** folder has a **Login** request that calls Supabase GoTrue
(`POST {{supabaseUrl}}/auth/v1/token?grant_type=password`) and captures the `access_token` into
`{{customerToken}}` / `{{adminToken}}`. Every other request in that flow inherits
`Authorization: Bearer {{token}}` automatically (public sub-folders override to No Auth).

Because the token carries a **real** Supabase `sub`, you must run **`/auth/sync`** (customer) /
**`/auth/admin/sync`** (admin) once after logging in — that mirrors the identity into the API's local
`users` table so the rest of the endpoints can resolve you.

## Prerequisites

1. **Run the API** (dev/watch — the `start:dev` equivalent), and start from an **empty DB**:
   ```bash
   pnpm nx run @tourism/api:reset   # empty all app tables (test from zero)
   pnpm nx serve @tourism/api       # watch + auto-restart; runs from repo root → http://localhost:3000
   ```
   `nx serve` is the recommended dev command. Alternative one-shot:
   `pnpm nx build @tourism/api && (cd apps/api && node dist/main.js)`.
   *(`pnpm nx run @tourism/api:seed` also exists — it bulk-loads a demo catalog + a self-signed PAID
   booking — but this collection is built to NOT need it. Use `seed` only if you want pre-filled data.)*
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

## Suggested run order (from zero — top to bottom)

0. **`_SETUP (Admin API)`** — once, to set the user passwords (see Setup step 3 above).
1. **ADMIN → 00 · Auth & Stats** — `Login` → `admin/sync` → `stats/dashboard` (zeros on an empty DB = OK).
2. **ADMIN → 01 Categories → 02 Destinations → 03 Tours → 04 Departures** — run the `POST ⭐` in each;
   they capture `{{categorySlug}}` → `{{destinationSlug}}` → `{{tourSlug}}`+`{{tourId}}` → `{{departureId}}`.
   The tour is created `isPublished:true`, so it shows publicly.
3. **CUSTOMER → 00 · Auth** — `Login` → `Sync local user` → `GET /users/me`.
4. **CUSTOMER → 01 · Catalog** — you now see the admin-created tour; the GETs re-capture the public vars.
5. **CUSTOMER → 02 Booking** — `POST /bookings` books that tour/departure (`{{bookingCode}}`) → `checkout`
   (open `checkoutUrl` to pay → webhook flips it PAID).
6. **CUSTOMER → 03 Reviews & Wishlist · 04 Enquiry** — review needs a **PAID** booking; wishlist + enquiry
   work anytime.
7. **Back to ADMIN → 06 Reviews Moderation · 07 Enquiries · 08 Bookings** — approve the review, advance the
   enquiry, refund the (PAID) booking.

> Want a clean slate again? `pnpm nx run @tourism/api:reset` and start at step 1.

Requests that create something capture the new id/slug into a `new*` variable (e.g. `{{newTourSlug}}`),
so the GET/PATCH/DELETE that follow just work without copy-paste.

## Caveats (read once)

- **Reviews + refund need a PAID booking.** `POST /reviews` (customer) and `POST /admin/bookings/:code/refund`
  (admin) both require the booking to be **PAID** — so complete `02 · Booking → checkout` and actually pay
  (the webhook flips it to PAID) before running them. On a PENDING booking they return 400/403.
- **Media `publicId`s must be real Cloudinary ids.** `PUT …/media` and `PUT /users/me/avatar` reference
  Cloudinary `public_id`s — mint a signed URL via **ADMIN → 05 · Media Uploads** and upload first, or
  the asset won't resolve.
- **Webhooks can't be called by hand** — they verify a provider signature over the raw body. Use the
  Stripe CLI (`stripe listen --forward-to localhost:3000/api/v1/payments/stripe/webhook`) or the PayPal
  sandbox simulator. The `_WEBHOOKS` folder documents the endpoints only.
- **Guarded deletes 409 on purpose.** The admin `DELETE` requests show the 3-tier delete policy: a
  published tour / active destination / referenced category-or-departure can't be hard-deleted (409).
  That's correct — unpublish/deactivate first, or remove the children.

## Negative cases included

A few `❌`-prefixed requests assert the guardrails: `401` (no token), `403` (customer hitting an admin
route), `404` (unknown slug/booking). Each has a `pm.test` so green/red shows in the Postman runner.
