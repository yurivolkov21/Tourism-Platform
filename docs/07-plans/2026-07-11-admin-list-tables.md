# Admin list-tables upgrade (Wave B1) — implementation plan

**Spec:** `docs/06-specs/2026-07-11-admin-list-tables-design.md`
**Branch:** `feat/admin-list-tables` · **Scope:** `apps/admin` only

**STATUS: EXECUTED** — T1-T8 done, gate green (admin 192 tests), 8-angle review: 3 findings fixed (dashboard inert sort buttons -> real sorting · error-branch filter props · shared `FacetFilter` extraction), 100-tour cap + refetch-per-nav + TabPills extraction noted as accepted/follow-up. Awaiting user confirm -> commit + ff-merge.

Standing rules: TDD on every pure helper (failing spec first) · straight quotes ·
no unrelated-line reformatting · tokens only (no hex) · reuse `@tourism/ui` ·
kill orphan node processes before any nx run.

## Tasks

### T1 — Table prefs codec (TDD)

- [x] `apps/admin/src/lib/table-prefs.spec.ts` first: `columnPrefsKey('tours')`
      → `tourism-admin.columns.v1.tours`; `parseStoredVisibility` accepts a JSON
      object with only-boolean values, returns `null` for invalid JSON, arrays,
      primitives, non-boolean values, `null`/`undefined` input.
- [x] `apps/admin/src/lib/table-prefs.ts` minimal to green.

### T2 — `usePersistentColumnVisibility` + wire into all 11 tables

- [x] Hook in `apps/admin/src/components/crud/use-persistent-column-visibility.ts`:
      `useState<VisibilityState>({})`, mount-effect reads
      `localStorage.getItem(columnPrefsKey(tableId))` through
      `parseStoredVisibility`, setter writes through (try/catch both sides).
- [x] RTL spec: renders default first, applies stored visibility after mount,
      persists a toggle.
- [x] Replace the `useState<VisibilityState>({})` in: tours-table,
      destinations-table, categories-table, departures-table, posts-table,
      reviews-view, bookings-table, users-table, enquiries-view, outbox-view,
      dashboard data-table — stable `tableId` per table (subscribers +
      cancellation-requests have no Columns menu).

### T3 — Sortable headers in the shared shell

- [x] `AdminTableShell`: sortable header cells render a toggle button
      (`getToggleSortingHandler`), trailing `ChevronsUpDown`/`ArrowUp`/`ArrowDown`,
      `aria-sort` on `TableHead`; non-sortable headers unchanged; right-aligned
      columns keep alignment.
- [x] RTL spec: unsorted → asc → desc cycle, `aria-sort` values, non-sortable
      header has no button.

### T4 — Enable sorting on the 5 client-mode tables

- [x] Per table: add `getSortedRowModel()` + `SortingState`, then per sortable
      column an `accessorFn` (numbers as numbers, dates via timestamp, strings
      case-insensitive — display columns stay unsortable by construction):
      tours (title, category, price, days, rating, next departure) ·
      destinations · categories · departures (start, end, price, seats) ·
      reviews (rating, date). Verify each table's existing spec stays green.

### T5 — Tours destination + featured filters (TDD predicate)

- [x] `apps/admin/src/lib/tours/filter.spec.ts` first: tab/category/search
      parity with the current inline logic, then destination multi-match (M:N)
      and `featuredOnly`.
- [x] `lib/tours/filter.ts` → swap `ToursTable`'s `useMemo` to it.
- [x] Toolbar UI: destination checkbox dropdown (category-dropdown pattern,
      options from rows) + Featured toggle button (`aria-pressed`, Star icon).

### T6 — Bookings tour/departure filters

- [x] TDD-light: generalize the UUID guard → `parseUuidParam` (shared with
      `userId`), spec for valid/invalid/undefined.
- [x] `bookings/page.tsx`: `Promise.all` adds `listTours({ pageSize: 100 })`
      (+ `listDepartures(tourSlug)` only when a valid `tourId` matched a tour);
      pass options + current selections into `BookingsFilters`.
- [x] `BookingsFilters`: Tour combobox (blog-v2 combobox pattern) + Departure
      select (disabled without tour, start-date labels); URL push resets
      `page`, tour change clears `departureId`; removable active-filter chips.
- [x] Existing bookings spec/page behavior unchanged when no filters set.

### T7 — Departures Upcoming · Past · All segment (TDD)

- [x] `matchesTimeTab` spec first in `lib/departures/format.spec.ts`
      (upcoming/past/all × past & future dates, today boundary = upcoming).
- [x] Implement in `lib/departures/format.ts`.
- [x] `DeparturesTable`: time segmented control (default `upcoming`) next to
      the status tabs; status counts recomputed within the active segment;
      empty-state copy aware of the segment.

### T8 — Gate + review + merge

- [x] Kill orphan node → `pnpm nx affected -t lint typecheck test build`
      (foreground, output to file) — green.
- [x] Code review pass (no money-path here; standard review, verify findings).
- [ ] Report to the user → confirm → commit (Conventional Commits) → rebase
      ff-only onto `main` → push → delete branch.
- [ ] Docs sweep (rule 9): this STATUS · roadmap · CLAUDE.md admin row + test
      baseline · HANDOFF current-state/next-action (mark B1 done, B2 next).
