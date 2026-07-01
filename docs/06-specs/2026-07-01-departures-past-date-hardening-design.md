# Departures past-date hardening — design

- **Date:** 2026-07-01
- **Scope:** `@tourism/api` (departures update guard) + `@tourism/admin` (departures list clarity)
- **Status:** approved direction, spec for execution
- **Trigger:** operational-logic review of Departures (2026-07-01). The existing flow is already safe
  against booking a past departure (defence in depth — see below); these two changes close a small
  data-integrity asymmetry and make the admin view honest about which departures have departed.

## Background — what's already correct (do NOT regress)

A departure can never be booked with a past date, via four independent layers:

1. **Web never shows past departures** — the booking picker calls `GET /tours/{slug}/departures` with no
   params, so it gets the public default (`from = today`, `status = OPEN`).
2. **Availability badge filters** `status = OPEN` + `startDate >= today` (`attachNextDeparture`).
3. **Create guard** — `DeparturesService.create` rejects `startDate < today` with `DEPARTURE_IN_PAST`.
4. **Booking guard (authoritative)** — `BookingsService.create` rejects a departure whose
   `startDate < today` with `DEPARTURE_DEPARTED`, **regardless of status** (so a re-opened old departure
   is still unbookable).

There is intentionally **no auto-close cron**: past departures self-hide (date filter) and self-reject
(layer 4), so their `OPEN`/`CLOSED` status is moot once the date passes. `status` exists to stop selling
a **future** departure (sold out / trip cancelled), not to tidy past ones. None of this changes.

## The two gaps

### Gap A (logic) — `update` doesn't re-apply the past-date guard

`DeparturesService.create` blocks `startDate < today`, but `DeparturesService.update` only checks the
date **range** (`end >= start`) and `seatsTotal >= seatsBooked`. An admin could `PATCH` a departure's
`startDate` into the past. It's not an exploitable booking hole (layers 1/2/4 still hold), but it's an
inconsistency: create is strict, update is lax.

### Gap B (UX) — the admin Departures list shows past rows as plain `OPEN`

The admin list (`/tours/[slug]/departures`) reads the **admin** surface (full history, no `from` filter),
so a departure that has already started still renders with its raw `OPEN`/`CLOSED` badge. To an operator
this reads as "still on sale" even though it's unbookable — exactly the confusion that prompted the
review.

## Design

### Fix A — guard `startDate` on update (move-to-past only)

Add a past-date check to `DeparturesService.update`, but **only when the caller is changing
`startDate`** (`body.startDate !== undefined`). Rule: *you may not move a departure's start into the
past.* Reuse the same UTC calendar-date compare and the same `DEPARTURE_IN_PAST` code as `create`.

Why gate on "startDate present" rather than "resulting start < today"? An admin must still be able to
edit an **already-past** departure without moving its date — e.g. mark a finished/aborted trip
`CANCELLED`, or correct a historical seat count. Blocking every edit to a past row would break that.
So:

- `body.startDate` absent → no past-check (editing seats/status/price on any row, incl. past, is fine).
- `body.startDate` present and `< today` → reject `DEPARTURE_IN_PAST` (can't move start into the past).
- `body.startDate` present and `>= today` → allowed (range check still applies).

Same-day (`startDate == today`) stays allowed (walk-in parity with `create`). No DTO change, no type
regen (error shape/`code` already exists in the admin error map — confirm `DEPARTURE_IN_PAST` is mapped;
add a friendly message if missing).

### Fix B — derived "Departed" state in the admin list

Add a **pure helper** `isDeparturePast(startDate: string): boolean` (UTC date compare, mirrors the BE)
in `apps/admin/src/lib/departures/format.ts`. In the list row, when a departure has started
(`startDate < today`):

- render a muted **`Departed`** chip next to the status badge (derived — no DB column, no API change);
- dim the row slightly (`text-muted-foreground` / reduced-emphasis) so past rows visually recede.

This keeps the real `status` visible (an admin still sees `OPEN`/`CLOSED`/`CANCELLED`) while making
"this date has passed, it's no longer bookable" obvious at a glance. Scope note: this list is a nested
per-tour page, **not** one of the six main tables from the TanStack/Columns work — it stays a plain
`<Table>`; we are only adding a derived badge + row treatment, not migrating it.

Optional (call it out, don't over-build): a lightweight time filter (Upcoming / Past / All) could be
added later, but the default admin list already shows everything and the chip solves the clarity
problem — defer unless asked.

## Testing

- **BE (Jest, `departures.service.spec.ts`):**
  - `update` rejects `DEPARTURE_IN_PAST` when `body.startDate` is a past date.
  - `update` **allows** editing an already-past departure when `startDate` is not sent (e.g. status →
    `CANCELLED`, or seat correction) — the key regression guard for the "move-to-past only" rule.
  - `update` allows moving `startDate` to today / a future date.
- **Admin (Jest, `format.spec.ts`):** `isDeparturePast` — past → true, today → false (walk-in parity),
  future → false; robust to ISO vs `YYYY-MM-DD` input.
- Visual (the chip + row dimming) verified on the Vercel deploy per the usual rhythm.

## Risks / edge cases

- **Timezone:** all comparisons use the UTC calendar-date slice (`toISOString().slice(0,10)`), matching
  every existing layer — do not introduce a local-time compare (would drift by server TZ).
- **Editing history:** the "startDate present" gate is load-bearing — verify the "allow status change on
  a past departure" test so we don't block cancelling/annotating finished trips.
- **No customer-facing change:** web already hides past departures; this spec touches only the admin
  surface + the admin-only update path. Confirm no public endpoint behavior shifts.

## Success criteria

- `PATCH` cannot move a departure's `startDate` into the past (`DEPARTURE_IN_PAST`), while non-date edits
  to past departures still succeed.
- The admin Departures list clearly marks departed rows (`Departed` chip + dimmed) without hiding their
  real status.
- `/gate` green on both affected projects; BE + admin each reviewed before merge.
