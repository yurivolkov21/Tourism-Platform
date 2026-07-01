# Admin Departures reskin — design

- **Date:** 2026-07-01
- **Scope:** `@tourism/admin` — the per-tour Departures surfaces (list + form)
- **Status:** approved direction, spec for execution
- **Trigger:** Departures is the last admin CRUD still on the pre-template look — plain `<Table>`, native
  `<select>` filter + status field, bespoke delete, no Columns button / pagination. Bring it in line with
  the established admin template (memory `admin-ui-design-consistency`): **same components, same layout,
  no bespoke one-offs.**

## Reference template (already shipped on Destinations / Categories / Tours)

- **List page:** `flex flex-col gap-6 px-4 py-6 lg:px-6` + `AdminListHeader` (title/description + a
  primary "New …" action) → a **client table component** doing: status **tabs with counts**,
  `ColumnsMenu`, `AdminTableShell` (TanStack), `ClientTablePagination`, and `RowActions` (⋮ Edit ·
  Delete). Load-all client-side (small catalog), instant filter.
- **Form:** shadcn **Form Layout 2** — sectioned `FieldSet` (left `FieldLegend`+`FieldDescription`
  column beside the fields), `Separator` between sections, `@tourism/ui` `Select` (never native
  `<select>`) with a hidden input to post the controlled value, `flex justify-end` Cancel(outline)+Submit.

## Gaps → changes

### A. Departures list (`app/(admin)/tours/[slug]/departures/page.tsx`)

Departures is a **nested, per-tour** surface, so it keeps a "Back to tours" link + the tour title as
context — but everything else adopts the template.

- Container → `flex flex-col gap-6 px-4 py-6 lg:px-6`.
- Header → `AdminListHeader` (title `Departures`, description = the tour title, action = "New
  departure"), with the "Back to tours" ghost link kept above it.
- Replace the native `<select>`+GET-form and the plain `<Table>` with a new client
  **`DeparturesTable`** component mirroring `ToursTable`:
  - **Status tabs** with counts: All / Open / Closed / Cancelled (client-side, like Tours' tabs).
  - **No free-text search** — a departure has no meaningful text key (it's dates); omitting the search
    box is the honest choice (not a different component, just an absent control).
  - Columns: Start · End · Seats (`booked/total`, right) · Price (override or "Tour base" + compare-at,
    right) · Status (the real `OPEN/CLOSED/CANCELLED` badge **plus the derived `Departed` chip** from
    `isDeparturePast`, moved here from Slice-2's inline render) · Actions. `enableHiding:false` on
    Start + Actions; the rest hideable via the **Columns** button.
  - `AdminTableShell` + `ColumnsMenu` + `ClientTablePagination`.
  - **`RowActions`** (⋮): Edit → `…/departures/[id]/edit`; Delete → `deleteDeparture(slug, id)` (bind
    the slug: `deleteAction={(id) => deleteDeparture(slug, id)}`). Drop the bespoke
    `delete-departure.tsx` (only the list used it) — consistent with how Tours dropped `DeleteTour`.
  - Past rows keep their dimmed date cells (carry the Slice-2 treatment into the cell renderers).
- The page fetches **all** departures (`listDepartures(slug, {})` — the admin endpoint returns full
  history unpaginated) and hands them to the client table; the old `?status=` URL filter is replaced by
  the client tabs.

### B. Departure form (`components/departures/departure-form.tsx`)

- Rebuild to **Form Layout 2**: two `FieldSet` sections —
  1. **Schedule & capacity** — Start date, End date, Total seats (+ the "N booked — can't set below"
     hint on edit).
  2. **Pricing & visibility** — Price override, Compare-at price, Status.
- **Status:** native `<select>` → `@tourism/ui` `Select` + hidden `name="status"` input (controlled),
  matching the tour/destination forms. Keeps `DEPARTURE_STATUSES` options.
- Button row → `flex justify-end gap-3` Cancel(outline) + Submit (template order).
- No change to field `name`s, `departureSchema`, or the server actions — purely presentational.

### C. New / Edit form pages

Keep the "Back to departures" link + heading (nested context), align the container to the form template
(`mx-auto max-w-2xl` is fine for a form; leave as-is or match the destination form page). Minimal — the
real change is the form component (B), which both pages already render.

## Out of scope

- No TanStack migration of anything beyond this list (Departures becomes the 7th table on the shared
  foundation — reusing `ColumnsMenu`/`AdminTableShell`/`ClientTablePagination`, no new shared code).
- No Upcoming/Past **tab** (the `Departed` chip + dimmed row already convey it; deferred in the hardening
  spec and still deferred).
- No BE / API / schema change. No web change.

## Testing

- Reuse existing `departures/schema.spec.ts` + `format.spec.ts` (`isDeparturePast` already tested).
- Typecheck is the guard for the table/column migration (mirrors the reviewed Tours pattern).
- Visual (tabs, Columns button, RowActions ⋮, Departed chip, reskinned form) verified on the Vercel
  deploy per the usual rhythm.

## Risks

- **Delete via RowActions** must bind the slug (`(id) => deleteDeparture(slug, id)`) — the shared
  `RowActions.deleteAction` is single-arg. Verify the AlertDialog copy + 409 (has-bookings) message
  still reach the user (RowActions already toasts + keeps the dialog open on error).
- **Base UI footguns** (known): `Select` needs `align="start" alignItemWithTrigger={false}` + hidden
  input; `ColumnsMenu`/`RowActions` already follow the safe patterns.
- **Removing `delete-departure.tsx`**: confirm no other importer before deleting.

## Success criteria

- Departures list looks and behaves like Destinations/Tours: template header, status tabs with counts,
  **Columns** button, pagination, ⋮ row actions — while keeping the tour context + Departed marking.
- Departure form is Form Layout 2 with a real `Select` (no native `<select>` left anywhere in
  Departures).
- `/gate` green on `@tourism/admin`; reviewed per slice before merge.
