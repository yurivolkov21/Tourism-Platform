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

- [ ] Slice 1 — Extract `insertFixtures`
- [ ] Slice 2 — Seed = fixtures + overlay (+ user DB verification)

## Out of scope (deferred)

- Wiring fixtures into unit/e2e suites; deleting fixture edge-case rows; any web/admin change.
