# Admin tables → TanStack + "Columns" — implementation plan

- **Date:** 2026-07-01
- **Spec:** [2026-07-01-admin-datatable-tanstack-columns-design](../06-specs/2026-07-01-admin-datatable-tanstack-columns-design.md)
- **Approach:** Option B (migrate all six admin tables to TanStack Table)
- **Rule:** one slice = one branch → `/gate` → code review → **user reviews on deploy** → merge → delete branch

## Sequencing rationale

The foundation (shared `ColumnsMenu` / `AdminTableShell` / `ClientTablePagination` / `lib/table.ts`) is
new, so it ships **inside the pilot** on the hardest client table (**Tours**: 8 columns, tabs, category
multi-filter, RowActions). If the foundation carries Tours, the rest are near-mechanical copies. Then
the simple client tables, then the server tables, then the special one (Enquiries).

## Slices

### Slice 1 — Foundation + **Tours** pilot
**Branch:** `feat/admin-table-tanstack-tours`

- Add `lib/table.ts` (ColumnMeta augmentation).
- Add `components/crud/columns-menu.tsx` (`ColumnsMenu<T>`).
- Add `components/crud/admin-table-shell.tsx` (`AdminTableShell<T>`, incl. `onRowClick`).
- Add `components/crud/client-table-pagination.tsx` (`ClientTablePagination<T>`).
- Migrate `tours/tours-table.tsx`:
  - keep the `useMemo` tab/category/search filter; `data = filtered`.
  - build `columns: ColumnDef<TourSummary>[]` — Title(link), Category, Primary destination, Price,
    Compare-at, Days, Status, Actions. `meta.label` on each; `enableHiding: false` on Title + Actions.
  - `useReactTable` (core + filtered + pagination models, `initialState.pagination.pageSize`).
  - toolbar gains `<ColumnsMenu table={table} />`; body via `<AdminTableShell>`; footer =
    `<ClientTablePagination table={table} />`.
- **Test:** `columns-menu` unit spec (jsdom).
- **Gate + review + deploy check.** This proves the whole pattern end-to-end.

### Slice 2 — **Destinations + Categories**
**Branch:** `feat/admin-table-tanstack-simple`

- Same recipe as Tours, minus the category filter. Destinations cols: Name(link), Region, Country,
  Status, Actions. Categories cols: (match current — Name, …, Status, Actions).
- Both are straight copies of the Tours pattern → low risk, batched into one slice.

### Slice 3 — **Bookings + Posts** (server tables, manual mode)
**Branch:** `feat/admin-table-tanstack-server`

- **Bookings:** `bookings-table.tsx` → `'use client'`, TanStack `manualPagination`, `data = rows`,
  columns Code(link)/Tour/Guest/Travel date/Payment/Total/Status. Thin toolbar row with
  right-aligned `ColumnsMenu`. `BookingsFilters` + `ServerTablePagination` in the page unchanged.
- **Posts:** extract `components/posts/posts-table.tsx` (client) from the inline RSC table; TanStack
  `manualPagination`; columns Title/Status/Published/Actions (`enableHiding:false` on Actions). Page
  keeps the filter `<form>`, `Empty`, and `ServerTablePagination`; render `<PostsTable rows={rows} />`.

### Slice 4 — **Enquiries** (special: drawer + row click)
**Branch:** `feat/admin-table-tanstack-enquiries`

- In `enquiries-view.tsx`, replace the inner `<Table>` with a TanStack table rendered via
  `<AdminTableShell table={table} onRowClick={setSelected} />`. Columns Name/Message/Received/Status
  (cells reuse current JSX incl. the tour Badge + line-clamp). `ColumnsMenu` next to the search input.
- Keep tabs, in-page search (`filtered` feeds `data`), the drawer, and optimistic status change intact.
- Client search still filters in memory → `data = filtered`; run `getCoreRowModel` only (paging stays
  `ServerTablePagination`; the in-page search is a view filter over the current server page, as today).

## Definition of done (per slice)

- `pnpm nx run-many -t lint typecheck test build -p @tourism/admin` green.
- ecc `code-reviewer` (+ `typescript-reviewer`) clean of CRITICAL/HIGH.
- User confirms on the Vercel deploy: Columns button toggles columns; filters/tabs/search/paging/row
  links/drawer/RowActions all unchanged.
- Branch merged `--ff-only` to `main`, branch deleted; memory + this plan's checklist updated.

## Progress

- [x] Slice 1 — Foundation + Tours (merged `475b293`)
- [x] Slice 2 — Destinations + Categories (merged `bbe96b0`)
- [x] Slice 3 — Bookings + Posts (merged `790db0e`)
- [x] Slice 4 — Enquiries (merged `1e19597`)

**DONE 2026-07-01.** All six admin tables migrated to TanStack Table with the shared foundation
(`crud/{columns-menu,admin-table-shell,client-table-pagination}` + `lib/table.ts`); each has a working
"Columns" show/hide button. Reviewed (ecc code-reviewer, 0 findings each) + gate-green per slice.
Reviews list has no table yet (backlog); when built it should adopt the same foundation.

## Out of scope (deferred)

- Column persistence (localStorage), sorting, row-selection, drag-reorder — Dashboard-only for now.
- Posts detail/media + Posts/Reviews list reskin (tracked separately in the roadmap).
