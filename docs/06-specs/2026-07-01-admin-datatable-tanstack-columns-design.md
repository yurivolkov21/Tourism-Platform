# Admin tables → TanStack + "Columns" toggle — design

- **Date:** 2026-07-01
- **Scope:** `@tourism/admin` — all six data tables
- **Status:** approved direction (Option B), spec for execution
- **Related:** [admin-dashboard-redesign](2026-06-30-admin-dashboard-redesign-design.md) (the reference
  TanStack table), rows-per-page pagination (Pass 1/2, shipped), memory `admin-ui-design-consistency`

## Why

Every admin list table is hand-rolled on `@tourism/ui` `<Table>`. The Dashboard bookings table
(`components/dashboard/data-table.tsx`) is the only one built on **TanStack Table**, and it's the only
one with a **"Columns" button** (show/hide columns). The user wants that button on **all** tables, and
chose **Option B: migrate every admin table to TanStack** so the whole admin shares one table engine —
consistent with the standing rule that admin surfaces must reuse the *same* components, not diverge.

This is a like-for-like structural migration: **same columns, same filters, same pagination behaviour,
same empty states** — the only new capability is column visibility. No sorting, no drag-reorder, no
row-selection (those stay Dashboard-only; YAGNI here).

## The six tables (current state)

| Table | Component | Data mode | Toolbar | Row actions | Special |
| --- | --- | --- | --- | --- | --- |
| Destinations | `destinations/destinations-table.tsx` | client (in-memory) | tabs (all/active/draft) + search | RowActions | — |
| Categories | `categories/categories-table.tsx` | client | tabs + search | RowActions | — |
| Tours | `tours/tours-table.tsx` | client | tabs + category multi-filter + search | RowActions (+Departures) | 8 cols |
| Bookings | `bookings/bookings-table.tsx` | **server** (URL) | `BookingsFilters` (separate) | — (row → detail) | read-only |
| Enquiries | `enquiries/enquiries-view.tsx` | **server** (URL) | tabs + in-page search | — (row → drawer) | row click, status drawer |
| Posts | `app/(admin)/posts/page.tsx` (inline RSC) | **server** (URL) | native `<form>` filter | Edit link + DeletePost | table is inline in the page |

- **Client tables** already load the full list and filter/paginate in memory (`DataTablePagination`).
- **Server tables** filter + paginate via the URL (`ServerTablePagination`), server returns one page.

## Design

### Principle: TanStack owns the **column model**, not the filtering

The migration must not change *what rows appear* or *how paging works* — only add column visibility.
So TanStack is used for: the column definitions, `flexRender` of header/body, and
`columnVisibility` state + the Columns menu. Everything else stays exactly as today:

- **Client tables:** keep the existing `useMemo` filter (tabs/search/category). Feed the **already
  filtered** rows into the table as `data`. TanStack runs `getFilteredRowModel` +
  `getPaginationRowModel` purely for in-memory paging of that filtered set. Pagination binds to the
  table instance.
- **Server tables:** run TanStack in **manual mode** (`manualPagination`, `manualFiltering`) — it
  renders the server's single page of rows and owns only visibility. Paging stays URL-driven
  (`ServerTablePagination`), filters stay where they are (BookingsFilters / tabs / native form).

This keeps the blast radius small and preserves every current behaviour, while giving all six the same
Columns control and the same header/body render path.

### Three shared pieces (the reusable surface)

All new code lands in `components/crud/` + `lib/`, next to the existing shared table bits:

**1. `lib/table.ts` — column-meta typing (no runtime code)**

```ts
import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // Human label shown in the Columns menu (falls back to column id).
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}
export {};
```

Column ids like `compareAtPrice` read badly in the menu; every hideable column carries
`meta: { label: 'Compare-at' }`.

**2. `components/crud/columns-menu.tsx` — the actual deliverable** (`'use client'`)

The reusable "Columns" dropdown, lifted verbatim from the Dashboard (`Columns3` + `ChevronDown`
trigger, `DropdownMenuCheckboxItem` per hideable column). Generic over the row type:

```tsx
export function ColumnsMenu<T>({ table }: { table: Table<T> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="cursor-pointer" />}>
        <Columns3 className="size-4" /> Columns <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {table.getAllColumns().filter((c) => c.getCanHide()).map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={c.getIsVisible()}
            onCheckedChange={(v) => c.toggleVisibility(!!v)}
            closeOnClick={false}
          >
            {c.columnDef.meta?.label ?? c.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- `closeOnClick={false}` (Base UI) so the menu stays open across multiple toggles — matches the Tours
  category filter pattern.
- Columns opt out of hiding with `enableHiding: false` (Actions column, and any always-on identity
  column we choose to pin).

**3. `components/crud/admin-table-shell.tsx` — shared header/body render** (`'use client'`)

Removes the repetitive `flexRender` boilerplate. Renders the bordered `<Table>`: header groups, body
rows, and a `colSpan` empty fallback. Optional `onRowClick` makes a row behave like a button
(role/tabindex/Enter+Space) — this is what lets Enquiries keep its drawer-on-click.

```tsx
interface AdminTableShellProps<T> {
  table: Table<T>;
  onRowClick?: (row: T) => void;   // opt-in row interactivity (Enquiries)
  emptyLabel?: string;             // fallback when the current page has no rows
}
```

Body `colSpan` uses `table.getVisibleLeafColumns().length` so it spans correctly after columns are
hidden.

**4. `components/crud/client-table-pagination.tsx` — TanStack ⇄ pagination adapter** (`'use client'`)

Symmetric with the existing `ServerTablePagination` (URL adapter). Binds the presentational
`DataTablePagination` to a client-side table instance — no change to `DataTablePagination` itself:

```tsx
export function ClientTablePagination<T>({ table }: { table: Table<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  return (
    <DataTablePagination
      page={pageIndex + 1}
      pageCount={table.getPageCount()}
      total={table.getFilteredRowModel().rows.length}
      pageSize={pageSize}
      onPageChange={(p) => table.setPageIndex(p - 1)}
      onPageSizeChange={(s) => table.setPageSize(s)}
    />
  );
}
```

Final pagination trio (consistent naming): `DataTablePagination` (dumb view) · `ServerTablePagination`
(URL adapter) · `ClientTablePagination` (table-state adapter).

### Per-table shape after migration

Each table becomes: **existing toolbar** + `<ColumnsMenu table={table} />` → `<AdminTableShell
table={table} />` → pagination (client or server adapter). The columns array moves each current
`<TableCell>`'s JSX into a `cell` renderer; headers become `header` strings with `meta.label`.

- **Tours / Destinations / Categories (client):** keep `useMemo` filter; `data = filtered`;
  `getCoreRowModel + getFilteredRowModel + getPaginationRowModel`;
  `initialState.pagination.pageSize = DEFAULT_PAGE_SIZE`; footer = `ClientTablePagination`. The outer
  `Empty` (zero filtered rows) stays as-is — the table only renders when there are rows. `enableHiding:
  false` on the Actions column; the primary name/title column stays visible too (pin it off-hiding).
- **Bookings (server):** `bookings-table.tsx` becomes `'use client'`; `manualPagination`; `data =
  rows`; a thin toolbar row holds `ColumnsMenu` (right-aligned) above the table; `BookingsFilters` and
  `ServerTablePagination` in the page stay untouched.
- **Posts (server):** extract the inline table into a new client `PostsTable` (mirrors `BookingsTable`)
  that owns the TanStack table + `ColumnsMenu`; the page keeps the filter `<form>`, `Empty`, and
  `ServerTablePagination`. Actions column (`Edit` + `DeletePost`) is `enableHiding: false`.
- **Enquiries (server):** `EnquiriesView` keeps tabs + search + drawer + status logic; its inner
  `<Table>` becomes a TanStack table rendered through `AdminTableShell` with `onRowClick={setSelected}`;
  `ColumnsMenu` sits next to the search box.

### What explicitly stays out (parity with Dashboard)

- No column **persistence** (Dashboard doesn't persist; keep parity — in-memory `columnVisibility`).
- No sorting, no row-selection checkboxes, no drag-reorder.
- No change to filters, URLs, server queries, empty states, or `DataTablePagination`.

## Testing

Per repo convention (TDD on pure logic; visual via deploy):

- **Unit (jsdom):** `ColumnsMenu` — renders one checkbox per hideable column, respects
  `enableHiding: false`, toggling calls `toggleVisibility`; label falls back id→`meta.label`. This is
  the one piece with real branching worth a test.
- **Typecheck** is the main guard for the columnDef migrations (`tsc --noEmit`, includes specs).
- **Visual/behaviour** (filters, paging, drawer, row links) verified on the Vercel deploy per slice —
  no local run.

## Risks

- **Base UI footguns** (already known): `DropdownMenuCheckboxItem` uses `checked`/`onCheckedChange` +
  `closeOnClick={false}`; menu items can't `render` a native `<button>`. ColumnsMenu follows the
  Dashboard usage exactly.
- **Server-table client conversion** (Posts, Bookings): moving rendering to a client component must not
  drop the server-driven filter/paging — those stay in the RSC page. Keep the split clean.
- **Enquiries row click** through `flexRender`: handled by `AdminTableShell.onRowClick` (row-level
  handler, cells still `flexRender`) so the drawer keeps working.
- **`@tanstack/react-table`** is already an admin dependency (Dashboard uses it) — no new packages.

## Success criteria

- All six tables render through TanStack + `AdminTableShell`, each with a working **Columns** button.
- Filters, tabs, search, pagination, row links, Enquiries drawer, RowActions all behave exactly as
  before.
- `/gate` green on `@tourism/admin` per slice; each slice reviewed on deploy before the next.
