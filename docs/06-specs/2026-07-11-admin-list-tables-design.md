# Admin list-tables upgrade (Wave B1) — design spec

**Date:** 2026-07-11 · **Scope:** admin only (no BE change) · **Status:** approved
(user 2026-07-11: B/C debt processed in 3 waves; B1 = this; row-selection cut —
deferred to the media-library bulk-delete work; Tours stays client-side filtered).

## Goal

Close the "list-table" debt group from the 2026-07-10 owed-features audit:

1. **Column sorting** on the client-mode admin tables (none exists today — no
   `getSortedRowModel` anywhere, including the dashboard).
2. **Column-visibility persistence** (localStorage) for every table with a
   Columns menu — today `VisibilityState` is plain `useState`, reset per load.
3. **Tours filters**: destination multi-select + Featured toggle (client-side,
   same in-memory model as the existing tab/category/search).
4. **Bookings filters**: Tour + dependent Departure comboboxes pushing
   `tourId`/`departureId` into the URL (API + data-layer already accept both).
5. **Departures**: an Upcoming · Past · All time segment (default **Upcoming**)
   composed with the existing status tabs, built on `isDeparturePast()`.

## Non-goals

- **Row selection / bulk actions** — no bulk operation exists yet; ships with
  the media-library bulk-delete debt (group A).
- **Bookings column sorting or date filters** — the API has no `sortBy` for
  bookings (newest-first only); a BE change belongs to a later wave.
- Moving Tours to server-driven URL filtering — the catalog is small and loaded
  once; the API's `sortBy/sortOrder/destination/featured` params stay in reserve.
- Reviews/Enquiries upgrades (Wave B2), any schema change (Wave C).

## Current state (verified 2026-07-11)

- Every admin table is TanStack v8 on the shared stack in
  `apps/admin/src/components/crud/` (`AdminTableShell`, `ColumnsMenu`,
  `Client/ServerTablePagination`) + `lib/table.ts` (`hideableColumns`,
  `ColumnMeta` augmentation).
- Two data modes: **client-mode** (Tours, Destinations, Categories, Departures,
  Reviews — load-all + in-memory filter) and **server-mode** (Bookings, Users,
  Enquiries, Outbox, Subscribers, Cancellation-requests — URL-driven).
- All table columns are **display columns** (`id` + `cell`, no accessor) — so
  enabling sort requires adding `accessorFn` per sortable column.
- No `localStorage` usage anywhere in `apps/admin/src` yet.
- `lib/departures/format.ts` already has `isDeparturePast(startDate)`.
- Bookings page already parses `userId` (UUID-guarded) from `searchParams` and
  `lib/bookings/data.ts` forwards `tourId`/`departureId`/`userId` 1:1 to the API.

## Design

### 1. Sortable headers (shared infra)

- `AdminTableShell` header cells: when `header.column.getCanSort()`, render the
  header content inside a toggle `<button>` (TanStack
  `getToggleSortingHandler()`), with a trailing icon — `ChevronsUpDown` (unsorted)
  / `ArrowUp` / `ArrowDown` — and `aria-sort` on the `TableHead`
  (`ascending`/`descending`/`none`). Non-sortable headers render as today.
- Tables opt in per TanStack v8 semantics: a column can sort only when it has
  an `accessorFn` — today's display columns (`id` + `cell`) can't, so sorting is
  strictly opt-in by **adding an `accessorFn`** (numeric fields sort as numbers,
  dates via timestamp, strings case-insensitive); accessor columns that must
  stay unsortable set `enableSorting: false`.
- Client-mode tables add `getSortedRowModel()` + `SortingState` state. Sorting
  applies to: Tours (title, category, price, days, rating, next departure),
  Destinations, Categories, Departures (start, end, price, seats), Reviews
  (rating, date) — exact columns decided per table at implementation, guided by
  "sort what an admin scans for".
- Server-mode tables keep `enableSorting: false` (no API sort — out of scope).
- Covered by an RTL component test (admin jest now supports RTL).

### 2. Column-visibility persistence

- New `lib/table-prefs.ts` (pure, TDD): `columnPrefsKey(tableId)` →
  `"tourism-admin.columns.v1.<tableId>"` and
  `parseStoredVisibility(raw: string | null): VisibilityState | null` — strict
  guard (JSON object, boolean values only; anything else → `null`).
- New hook `usePersistentColumnVisibility(tableId)` (client): starts `{}` (SSR-
  safe — the server-rendered HTML always shows the default columns), applies the
  stored value in a mount `useEffect`, and writes through on every change.
  The one-frame default-columns flash on load is accepted (admin-only UI, avoids
  hydration mismatch).
- Swapped into **every** table that renders `ColumnsMenu` — 11 in total:
  tours, destinations, categories, departures, posts, bookings, users, reviews,
  enquiries, outbox, dashboard recent-bookings — each with a stable `tableId`.
  (Subscribers and cancellation-requests have no Columns menu — nothing to
  persist.)

### 3. Tours filters

- Extract the in-memory predicate from `ToursTable` into
  `lib/tours/filter.ts` — `filterTourRows(rows, { tab, categories,
  destinations, featuredOnly, query })` (pure, TDD) — and extend it with:
  - `destinations`: match any of the tour's destination slugs (M:N — a tour
    counts for every destination it has);
  - `featuredOnly`: `isFeatured === true`.
- Toolbar: a "Filter by destination" checkbox dropdown (same component pattern
  as the existing category dropdown, options derived from loaded rows) + a
  Featured outline toggle button (Star icon, `aria-pressed`).

### 4. Bookings filters

- `bookings/page.tsx` fetches the tour options in the existing request
  (`Promise.all` with `listTours({ pageSize: 100 })` — transaction-pooler rule:
  parallel reads via `Promise.all`) and, **when `tourId` is set**, the
  departures of that tour (`listDepartures`) for the dependent select. RSC
  refetch on URL change makes the dependency automatic.
- `BookingsFilters` gains two selects (searchable combobox for Tour — reuse the
  admin combobox pattern from blog-v2; simple select for Departure, disabled
  until a tour is chosen, labelled by start date): both push `tourId` /
  `departureId` to the URL, always resetting `page`; changing tour clears
  `departureId`; a "Clear" affordance removes both.
- `page.tsx` guards both params with the existing UUID regex (generalize
  `parseUserId` → shared `parseUuidParam`, TDD-light).
- Active filters render as removable summary chips above the table (tour title /
  departure date), so a deep-linked view is legible.

### 5. Departures time segment

- Pure helper in `lib/departures/format.ts`: `matchesTimeTab(startDate, tab)`
  (`'upcoming' | 'past' | 'all'`, reusing `isDeparturePast`) — TDD.
- UI: a compact segmented control (Upcoming · Past · All) rendered next to the
  existing status tablist, default **Upcoming**. Filters compose with AND.
- Counts: the time segment shows global counts; the status tabs' counts are
  computed **within the active time segment** (so "OPEN (3)" means 3 open
  upcoming departures while Upcoming is active).

## Error handling

- localStorage read/write wrapped in try/catch (quota/privacy mode) — failure
  degrades to the current per-session behavior.
- Bookings: an unknown/foreign `departureId` simply yields an empty page (API
  already scopes correctly); UUID guard drops malformed params.

## Testing

- TDD (jest, pure): `parseStoredVisibility`/`columnPrefsKey` ·
  `filterTourRows` · `matchesTimeTab` · `parseUuidParam`.
- RTL: sortable-header rendering + toggle in `AdminTableShell`; persistence
  hook applies stored visibility after mount.
- Existing table specs stay green; `/gate` before declaring done.

## Definition of done

- Sortable columns live on the 5 client-mode tables; Columns menu choices
  survive reload on all 12 tables; Tours filterable by destination/featured;
  Bookings filterable by tour/departure via URL (deep-linkable); Departures
  default to Upcoming with a Past/All switch; gate green; user visual pass on
  deployed admin.
