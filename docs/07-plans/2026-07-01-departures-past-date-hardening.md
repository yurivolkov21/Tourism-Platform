# Departures past-date hardening — implementation plan

- **Date:** 2026-07-01
- **Spec:** [2026-07-01-departures-past-date-hardening-design](../06-specs/2026-07-01-departures-past-date-hardening-design.md)
- **Rule:** one slice = one branch → `/gate` → code review → **user reviews on deploy** → merge → delete branch

## Sequencing

Two independent, small changes on different deploy targets (Render vs Vercel). BE first (it's the
logic guard + it defines the `DEPARTURE_IN_PAST` error the admin then surfaces), then the admin UI.

## Slice 1 — BE: guard `startDate` on departure update (Render)

**Branch:** `feat/api-departure-update-past-guard`

- `apps/api/src/modules/departures/departures.service.ts` → `update()`: after the existing
  `assertDateRange`, add — **only when `body.startDate !== undefined`** — the UTC past-date check
  mirroring `create()`; throw `BadRequestException { code: 'DEPARTURE_IN_PAST' }` when the new
  `startDate < today`. Extract the shared check into a private helper (`assertNotPast(startIso)`) and
  call it from both `create` and `update` (DRY, single source of truth).
- Tests (`departures.service.spec.ts`):
  - `update` throws `DEPARTURE_IN_PAST` when `startDate` is a past date.
  - `update` **allows** a non-date edit on an already-past departure (e.g. `status: CANCELLED`, or a
    seat correction) — asserts the "startDate present" gate, the key regression guard.
  - `update` allows moving `startDate` to today / future.
- **Admin error map** (`apps/admin/src/lib/api/error.ts`): add friendly copy for `DEPARTURE_IN_PAST`
  (+ `INVALID_DATE_RANGE`, `SEATS_TOTAL_BELOW_BOOKED` while we're here — currently these surface raw API
  text on the departure form). *(This is a 3-line admin edit; fold it into this slice since it's the
  user-facing half of the same guard. No type regen — no DTO/response change.)*
- **Gate** (`@tourism/api` lint/typecheck/test/build + `@tourism/admin` for the error-map edit) +
  code review (touches booking-adjacent logic → `ecc:code-reviewer`).

## Slice 2 — Admin: mark departed rows in the list (Vercel)

**Branch:** `feat/admin-departures-departed-badge`

- `apps/admin/src/lib/departures/format.ts`: add pure `isDeparturePast(startDate: string): boolean`
  (UTC `toISOString().slice(0,10)` compare vs today; today → false for walk-in parity).
- `apps/admin/src/app/(admin)/tours/[slug]/departures/page.tsx`: when `isDeparturePast(d.startDate)`,
  render a muted `Departed` chip beside the status `Badge` and apply a subtle row de-emphasis
  (`text-muted-foreground` on the date cells / reduced emphasis). Keep the real status badge visible.
- Tests (`format.spec.ts`): `isDeparturePast` past → true, today → false, future → false; tolerant of
  ISO vs `YYYY-MM-DD`.
- **Gate** (`@tourism/admin`). UI-only + pure helper mirroring an existing pattern → self-certify unless
  the diff grows; a quick review is optional.

## Definition of done (per slice)

- `pnpm nx run-many -t lint typecheck test build -p <project>` green.
- BE slice: `ecc:code-reviewer` clean of CRITICAL/HIGH (booking-adjacent).
- User confirms on deploy: can't move a departure into the past (clear message); past departures read as
  `Departed` in the admin list; editing/cancelling a past departure still works.
- Branch merged `--ff-only` to `main`, branch deleted; memory + this plan updated.

## Progress

- [x] Slice 1 — BE update guard + admin error copy (merged `3eb2ee9`)
- [x] Slice 2 — Admin departed-row badge (merged `6cd2f50`)

**DONE 2026-07-01.** `assertNotPast()` now shared by create + update (update guards only when
`body.startDate` is sent, so history stays editable); admin surfaces friendly copy for the three 400
codes; the admin departures list marks past rows with a muted `Departed` chip + dimmed date cells.
Gate-green both projects; BE reviewed (ecc code-reviewer, 0 findings), admin self-certified (UI + pure
helper with tests). Booking a past departure was already blocked at 4 layers; this closed the
create/update asymmetry + the admin-visibility gap.

## Out of scope (deferred)

- Auto-close cron for past departures — unnecessary by design (they self-hide + self-reject); not adding.
- Upcoming/Past/All time filter on the admin list — the `Departed` chip solves the clarity need; add
  later only if asked.
- Any web/customer-facing change — the public flow already hides + rejects past departures.
