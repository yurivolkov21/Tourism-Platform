# Design spec — Admin Departures CRUD

> Branch: `feat/admin-departures-crud` · 4th admin model. Departures are a **nested resource** under a
> tour (`/admin/tours/:slug/departures`), so this departs from the flat-catalog template.
> API: `apps/api/src/modules/departures/admin-departures.controller.ts`.

## API shape (what's different)

- **Nested only** — no flat `/admin/departures`. Endpoints: `GET` (list, **plain array**, full history
  ordered by `startDate` asc — NOT paginated), `POST` (create), `PATCH :id`, `DELETE :id`. All take the
  tour `:slug` in the path.
- **No GET-one** — to edit, fetch the list and find by `id`.
- **Envelope:** the array list comes back wrapped `{ data: [...], error: null }` (interceptor Branch 3),
  so unwrap `.data` (the client types it bare).
- **Fields:** `startDate` / `endDate` (ISO `YYYY-MM-DD`, `endDate ≥ startDate`), `seatsTotal` (1–1000),
  `priceOverride?` (decimal; null = use tour base price), `compareAtPrice?` (decimal), `status`
  (`OPEN` / `CLOSED` / `CANCELLED`, default OPEN). `seatsBooked` is **read-only** (owned by the booking
  flow) — shown in the list, never in the form.
- **Errors:** 400 (bad date range / past start / `seatsTotal` below booked), 404 (tour/departure), 409
  (delete with bookings).

## UI placement (the key IA decision)

Because departures belong to a tour, they're managed **inside the tour context**, not as a top-level
catalog:

- **Page:** `/tours/[slug]/departures` — lists that tour's departures (table) + "New departure".
- **Forms:** `/tours/[slug]/departures/new` and `/tours/[slug]/departures/[id]/edit` (edit reads the
  list, finds by id).
- **Entry point:** a **"Departures" action on each tour row** in `/tours` (and a link on the tour edit
  page header).
- **Nav:** **remove the standalone "Departures" sidebar item** (it has no global endpoint/page). This is
  the one notable IA change from the earlier "soon" nav.

## List table

Start · End · Seats (`seatsBooked`/`seatsTotal`) · Price (`priceOverride` or "Tour base", + strike
`compareAtPrice`) · Status badge (OPEN green / CLOSED muted / CANCELLED destructive) · actions
(Edit · Delete). Optional `status` filter. Tour title shown in the page header for context. Empty state.

## Form

`startDate` (date input) · `endDate` (date) · `seatsTotal` (number 1–1000) · `priceOverride?` (number,
blank = tour base) · `compareAtPrice?` (number) · `status` (select). Edit prefilled from the list row;
on edit, lowering `seatsTotal` below `seatsBooked` → API 400 surfaced inline.

## Data + validation

- **`lib/departures/schema.ts`** (zod, TDD): ISO dates, `endDate ≥ startDate` refine, `seatsTotal`
  1–1000 (`z.coerce`), prices `z.coerce.number().min(0)` optional, `status` enum. `toDeparturePayload`
  drops blank optionals; sends `priceOverride`/`compareAtPrice` only when provided.
- **`lib/departures/data.ts`:** `listDepartures(slug)` → unwrap `.data` to `DepartureDto[]`.
- **`lib/departures/actions.ts`:** `createDeparture(slug, …)` / `updateDeparture(slug, id, …)` /
  `deleteDeparture(slug, id)` (`revalidatePath('/tours/[slug]/departures')`; map 400/409 via
  `apiErrorMessage`).

## Tasks (one commit each)

- **D1** — `lib/departures/schema.ts` + `toDeparturePayload` (TDD: date refine, seats/price bounds, enum).
- **D2** — `lib/departures/data.ts` (`listDepartures`, unwrap).
- **D3** — `/tours/[slug]/departures` list page + "Departures" action on the tour row + remove global nav item.
- **D4** — `DepartureForm` + create/update actions + `new` / `[id]/edit` pages.
- **D5** — delete (`DeleteDeparture` AlertDialog + 409 has-bookings).
- **D6** — gate + no-hex; stop for review.

## Out of scope

Bulk/recurring departure generation; calendar view; editing `seatsBooked` (booking-owned).
