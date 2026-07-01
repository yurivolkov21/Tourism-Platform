# Admin Departures reskin — implementation plan

- **Date:** 2026-07-01
- **Spec:** [2026-07-01-admin-departures-reskin-design](../06-specs/2026-07-01-admin-departures-reskin-design.md)
- **Rule:** one slice = one branch → `/gate` → review/self-cert → **user reviews on deploy** → merge → delete branch

## Slice 1 — List reskin (the visible bulk)

**Branch:** `feat/admin-departures-list-reskin`

- New client `components/departures/departures-table.tsx` (mirrors `tours-table.tsx`):
  - props `{ rows: Departure[]; slug: string; currency: string }`.
  - status tabs All/Open/Closed/Cancelled with counts (client `useMemo` filter, `data = filtered`).
  - columns Start / End / Seats / Price / Status(+`Departed` chip) / Actions; `meta.label` on each;
    `enableHiding:false` on Start + Actions; right-align Seats/Price.
  - `useReactTable` (core + filtered + pagination) + `ColumnsMenu` + `AdminTableShell` +
    `ClientTablePagination`.
  - `RowActions` with `deleteAction={(id) => deleteDeparture(slug, id)}`, edit href, has-bookings copy.
  - carry the past-row dimming (`isDeparturePast`) into the Start/End cell renderers.
- Rewrite `app/(admin)/tours/[slug]/departures/page.tsx`: template container + "Back to tours" link +
  `AdminListHeader` (+ "New departure" action) + `Empty` + `<DeparturesTable …>`; fetch all
  (`listDepartures(slug, {})`), drop the `?status=` URL filter + native select form.
- Delete `components/departures/delete-departure.tsx` (now unused — RowActions covers it); `git rm`.
- **Gate** `@tourism/admin` + `ecc:code-reviewer` (new table component + delete-path rewiring).

## Slice 2 — Form reskin

**Branch:** `feat/admin-departures-form-reskin`

- Rebuild `components/departures/departure-form.tsx` to Form Layout 2: two `FieldSet` sections
  (Schedule & capacity · Pricing & visibility), `Separator` between; native `<select>` status →
  `@tourism/ui` `Select` + hidden input; `flex justify-end` Cancel(outline)+Submit. No field-name /
  schema / action changes.
- Align the new/edit page wrappers if needed (keep Back link + heading).
- **Gate** `@tourism/admin`. UI-only reskin mirroring the reviewed destination/tour form → self-certify;
  quick review optional.

## Definition of done (per slice)

- `pnpm nx run-many -t lint typecheck test build -p @tourism/admin` green.
- Slice 1: `ecc:code-reviewer` clean of CRITICAL/HIGH.
- User confirms on deploy: list matches the other admin tables (header, tabs, Columns, pagination, ⋮
  actions, Departed chip); form is Form Layout 2 with a real Select; delete + filters still work.
- Branch merged `--ff-only` to `main`, branch deleted; memory + this plan updated.

## Progress

- [x] Slice 1 — List reskin (table + page + drop bespoke delete) (merged `cd1e4b0`)
- [x] Slice 2 — Form reskin (Form Layout 2 + Select) (merged `b81bc54`)

**DONE 2026-07-01.** Departures is now the 7th table on the shared TanStack foundation (template
header + status tabs with counts + Columns button + pagination + `RowActions` ⋮, Departed chip in the
Status column); bespoke `delete-departure.tsx` removed. Form rebuilt to Form Layout 2 with a real
`Select` — the last native `<select>` in the admin is gone. Slice 1 reviewed (ecc code-reviewer, 0
findings); Slice 2 self-certified (form reskin mirroring the reviewed destination form). Gate-green each.

## Out of scope (deferred)

- Upcoming/Past time tab, any BE/API/web change — none needed.
