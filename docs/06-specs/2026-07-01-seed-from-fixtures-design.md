# Seed from fixtures (Option A) — design

- **Date:** 2026-07-01
- **Scope:** `@tourism/api` — `prisma/seed.ts` + `prisma/fixtures/*`
- **Status:** approved direction (Option A), spec for execution
- **Trigger:** the hand-authored `seed.ts` catalog was patchy test data. We now have a rich, varied,
  schema-verified fixture set (`prisma/fixtures`, 18 models / 369 rows). The user wants the seed to use
  the fixtures as its data source — **but keep the functional scaffolding** that makes auth-gated flows
  testable. (Not a blind "replace seed with fixtures", which would break login-able accounts + the
  review flow.)

## The distinction that shapes the design

`seed.ts` is not just catalog data — it provides **functional scaffolding** the fixtures lack:

- A **known, login-able customer** (`customer@tourism.test`, `supabaseId 1111…`) + an **admin**
  (email from `ADMIN_EMAILS`, `supabaseId 2222…`), upserted by email.
- A **self-signed PAID booking** (`BK-SEEDPAID`) owned by that customer, so `POST /reviews`,
  "my bookings", and the e2e suite run without a live payment.
- An **E2E creds artifact** (`writeFileSync`, e.g. `E2E_PAID_BOOKING_CODE=…`) the e2e suite reads.

Fixtures give a **richer catalog + sample users/bookings/reviews** (regions match REGION_ORDER exactly;
22/23 tours published, 9 featured → public site + home shelf populate; ratings display from the 26
fixture reviews). But fixture users are `@example.com`/`@nexora.travel` with fabricated `supabaseId`s —
**nobody can log in as them**, and their bookings aren't owned by an account you control.

**So: fixtures for the DATA, a thin overlay for the FUNCTIONAL accounts + one owned PAID booking.**

## Design

### 1. Extract a shared `insertFixtures(prisma)`

Move the ordered, FK-safe `createMany({ skipDuplicates })` steps out of `load-fixtures.ts` into a
reusable `prisma/fixtures/insert.ts` exporting `insertFixtures(prisma): Promise<number>`. Both callers
use it:

- `load-fixtures.ts` (standalone runner) — keeps its **local-DB guard** + connection setup, calls
  `insertFixtures`.
- `seed.ts` — calls `insertFixtures` with the seed's own Prisma client. **No guard here**: seeding the
  configured DB (DIRECT_URL/Supabase) is exactly the seed's job.

### 2. Rewrite `seed.ts` = fixtures + thin overlay

`main()` becomes:

1. **`await insertFixtures(prisma)`** — the whole catalog + sample users/bookings/reviews/etc.
2. **Overlay (idempotent):**
   - Upsert `customer@tourism.test` (`supabaseId 1111…`, CUSTOMER) — the account you register in
     Supabase to log in as a customer (relink-by-email, unchanged from today).
   - Upsert admin: `email = ADMIN_EMAILS[0] || 'admin@tourism.test'` (`supabaseId 2222…`, ADMIN). Note:
     admin *access* is granted by `ADMIN_EMAILS` + a real Supabase account, not by this row — the row is
     a convenience mirror. If the email equals a fixture admin (`admin@nexora.travel`), the upsert just
     updates that row.
   - Create **`BK-SEEDPAID`** (once; skip if the code exists) owned by the overlay customer, on a
     **dynamically chosen OPEN fixture departure with ≥2 free seats** (prefer `hoi-an-walking-tour` when
     present — it is), claiming the 2 seats in a `$transaction`. Robust: no hard-coded departure id.
3. **Write the E2E creds artifact** (unchanged).

Everything hand-authored that the fixtures now cover is **deleted**: the ~800-line catalog builder, the
reviewer pool + per-review backing bookings (fixtures supply 26 reviews for display), and
`seed-itineraries.ts` if it's only used by the old catalog path (verify + remove if orphaned).

### 3. Full-refresh flow (unchanged tooling)

`reset.ts` (TRUNCATE … CASCADE) stays the explicit destructive step. To rebuild:

```bash
cd apps/api
pnpm exec ts-node --transpile-only prisma/reset.ts     # wipes app tables (see ⚠️ below)
pnpm nx run @tourism/api:seed                           # fixtures + overlay
```

Re-running seed alone is safe (fixtures `skipDuplicates` + overlay upsert/skip).

## ⚠️ Operational warnings (must be understood before running)

- **`reset.ts` truncates the DB that `DIRECT_URL`/`DATABASE_URL` points at — the LIVE Supabase the
  deployed site reads.** Running reset wipes the current production-facing data and replaces it with the
  fixture dataset. Acceptable here (this is the project's shared dev/demo DB) but it IS destructive and
  changes what the live site shows.
- **Supabase auth accounts are separate** (auth schema, not app tables) — reset does NOT delete them.
  After reset+seed, your existing login re-mirrors on next sign-in (`syncUser`/relink-by-email). But your
  real account will only "own" `BK-SEEDPAID` if you log in as `customer@tourism.test`; other fixture
  bookings belong to fixture users.
- **Seat safety:** the overlay picks a departure with free seats and claims inside a transaction, so it
  can't overbook.

## Testing / verification

- **Automated:** `/gate` on `@tourism/api` (lint/typecheck/build) — the seed compiles + the shared
  `insertFixtures` typechecks. The fixture↔schema match is already verified.
- **Manual (user, on their DB):** I cannot run DB writes against the live Supabase, so the user runs
  `reset` + `seed` and verifies, one step at a time: public catalog rich + regions/featured populate;
  admin login (email in `ADMIN_EMAILS`); customer login as `customer@tourism.test`; "my bookings" shows
  `BK-SEEDPAID`; leave-a-review works. I'll provide the runbook.

## Non-goals / risks

- Not wiring fixtures into the unit/e2e test suites (separate future task).
- Not deleting the fixtures' intentional edge cases (1 draft tour, inactive category/destination) — they
  make the data realistic + are harmless to the public site (only 1 draft).
- Behaviour change: the seed no longer creates the old reviewer pool; ratings now come from fixture
  reviews. E2e that asserted specific old reviewer names/counts (if any) would need updating.

## Success criteria

- `seed.ts` is a thin "load fixtures + overlay" script; the hand-authored catalog is gone.
- After `reset` + `seed`: rich public catalog, working admin + `customer@tourism.test` login, a
  `BK-SEEDPAID` PAID booking owned by that customer, review/my-bookings flows runnable.
- `/gate` green on `@tourism/api`; reviewed before merge; user verifies on their DB before we call it
  done.
