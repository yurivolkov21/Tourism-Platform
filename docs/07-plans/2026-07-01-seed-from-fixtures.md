# Seed from fixtures (Option A) — implementation plan

- **Date:** 2026-07-01
- **Spec:** [2026-07-01-seed-from-fixtures-design](../06-specs/2026-07-01-seed-from-fixtures-design.md)
- **Rule:** one slice = one branch → `/gate` → review → merge. **User verifies on their DB** (destructive
  reset) before we call the feature done.

## Slice 1 — Extract `insertFixtures(prisma)` (pure refactor, no behaviour change)

**Branch:** `refactor/api-fixtures-insert-shared`

- New `prisma/fixtures/insert.ts`: `export async function insertFixtures(prisma): Promise<number>` — the
  ordered, FK-safe `createMany({ skipDuplicates })` steps (moved verbatim from `load-fixtures.ts`).
- `load-fixtures.ts`: keep the local-DB safety guard + connection setup; replace the inline steps with
  `await insertFixtures(prisma)`.
- **Gate** `@tourism/api` (lint/typecheck/build). Low risk — same behaviour, just relocated.

## Slice 2 — Rewrite `seed.ts` = fixtures + overlay

**Branch:** `feat/api-seed-from-fixtures`

- Rewrite `prisma/seed.ts`:
  1. `await insertFixtures(prisma)`.
  2. Overlay: upsert `customer@tourism.test` (1111…) + admin (`ADMIN_EMAILS[0]`, 2222…); create
     `BK-SEEDPAID` once, owned by the customer, on a dynamically chosen OPEN fixture departure with ≥2
     free seats (prefer `hoi-an-walking-tour`), claiming seats in a `$transaction`.
  3. Keep the E2E creds artifact write.
- Delete the hand-authored catalog builder + reviewer/review-booking pool. Remove `seed-itineraries.ts`
  if it's now orphaned (grep first).
- Keep `reset.ts` unchanged.
- **Gate** `@tourism/api` + `ecc:code-reviewer` (load-bearing seed; verify overlay idempotency, seat
  safety, no overbook, artifact preserved).
- **User verification (manual, their DB):** provide a runbook; walk through `reset` → `seed` → check
  public catalog + admin login + `customer@tourism.test` login + `BK-SEEDPAID` in my-bookings + review
  flow. One step at a time (destructive reset — confirm each step).

## Definition of done

- `pnpm nx run-many -t lint typecheck build -p @tourism/api` green each slice.
- Slice 2: `ecc:code-reviewer` clean of CRITICAL/HIGH.
- User runs reset+seed on their DB and confirms the flows work.
- Branches merged `--ff-only`, deleted; memory + docs (seed behaviour) updated; this plan checked off.

## Progress

- [x] Slice 1 — Extract `insertFixtures` (merged `6426abb`)
- [x] Slice 2 — Seed = fixtures + overlay (merged `992af11`) — ecc APPROVE 0 findings
- [ ] User verification on their DB (reset + seed) — pending; runbook below

**Code DONE 2026-07-01.** `seed.ts` is now ~79 lines (was 1195): `insertFixtures` + upsert
customer/admin + one self-signed `BK-SEEDPAID` on an OPEN fixture departure with free seats + `.env.e2e`
artifact. `seed-itineraries.ts` removed. Reviewer confirmed DB CHECK `seats_booked <= seats_total`
backstops seat safety; `.env.e2e` keys match what `test/app.e2e.ts` reads.

## Runbook — user verifies on their DB (⚠️ destructive)

```bash
cd apps/api
# 1. (optional but recommended) back up anything you care about — reset WIPES all app tables.
# 2. Reset the DB that DIRECT_URL points at (the live Supabase):
pnpm exec ts-node --transpile-only prisma/reset.ts
# 3. Seed from fixtures + overlay:
pnpm nx run @tourism/api:seed
```

Then verify: public site catalog is rich (regions/featured populate); admin login works (your email in
`ADMIN_EMAILS`); customer login as `customer@tourism.test` (register that email in Supabase if not
already); "my bookings" shows `BK-SEEDPAID`; leaving a review works. Report back if anything's off.

## Out of scope (deferred)

- Wiring fixtures into unit/e2e suites; deleting fixture edge-case rows; any web/admin change.
