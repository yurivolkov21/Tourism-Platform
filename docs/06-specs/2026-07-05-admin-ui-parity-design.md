# Admin UI parity — Outbox reskin + Dashboard table refactor

- **Date:** 2026-07-05
- **Scope:** `apps/admin` only. Zero BE, zero schema, zero regen. Closes P4's last
  "Remaining: UI polish" item.
- **Origin:** post-blog-v2 audit (Explore agent, 2026-07-05) found the admin's new
  pattern (AdminListHeader · AdminTableShell/TanStack · ColumnsMenu · tabs/search ·
  Server/ClientTablePagination · RowActions · card-layout details · Form Layout 2)
  already covers **every** surface except two: `/outbox` (bespoke raw `<Table>`) and
  the Dashboard recent-bookings widget (self-contained shadcn dashboard-01 table).
  The roadmap's "list reskin for Posts/Reviews" note was stale — those shipped earlier.

## User decisions (2026-07-05)

1. Scope = **both** leftovers (Outbox + Dashboard widget), one branch
   `feat/admin-ui-parity`.
2. **Retry stays an inline button** on `/outbox` (not a ⋮ RowActions menu) — the queue
   has exactly one action and the in-flight spinner belongs on the button. This is a
   *deliberate, documented* deviation from the RowActions pattern.

## Verified facts

- `AdminTableShell<T>` takes a TanStack `table` (+ optional `onRowClick`, `emptyLabel`);
  right-aligned columns via `columnDef.meta.align`. `ColumnsMenu<T>` lists hideable
  columns (via `lib/table.hideableColumns`). `ClientTablePagination` wraps
  `DataTablePagination` incl. the page-size select.
- `GET /admin/outbox` supports pagination + `status` filter ONLY — no search param.
  Page size 20; the queue is operational, not exploratory → **no search** (YAGNI).
- `outbox-view.tsx` already has: server-driven status tabs (in `outbox/page.tsx`),
  `ServerTablePagination`, toast on retry, a `ReadonlySet` of in-flight row ids
  (comment documents the duplicate-retry race — MUST survive the rewrite).
- `dashboard/data-table.tsx` (236 lines) = TanStack + bespoke table markup + bespoke
  pagination footer + own Tabs; no dnd. Used once (`app/(admin)/page.tsx:44`).
- `formatDate` (en-GB `d MMM yyyy`, `'—'` fallback) is copy-pasted in
  `outbox-view.tsx`, `media/garbage-view.tsx`, `subscribers/subscribers-view.tsx`.

## Design

### 1. Shared date helper (targeted DRY)

`apps/admin/src/lib/format-date.ts` (pure, TDD):
`formatShortDate(iso?: string | null): string` — `'—'` for null/undefined/unparsable,
else `en-GB` `day numeric · month short · year numeric`. The three copy-pasted locals
are deleted; their files import this instead. No other formatting is touched.

### 2. `/outbox` reskin (`components/outbox/outbox-view.tsx`)

Rebuild the table on the shared stack, keeping ALL behavior:

- TanStack `useReactTable` with columns: Type (mono) · Status (badge) · Attempts
  (destructive badge when > 0) · Last error (truncated, hideable) · Queued ·
  Processed (hideable) · Retry (`meta.align: 'right'`, `enableHiding: false`).
- Render via `AdminTableShell`; toolbar row gains `ColumnsMenu` beside the existing
  total-count line. Status tabs stay in `page.tsx` (server-driven, untouched).
- `ServerTablePagination`, empty state, toast, and the in-flight `ReadonlySet` retry
  logic move over verbatim. Retry cell: same inline `Button` + `Spinner`, rendered
  only for `FAILED` rows.
- No search added (BE has none — see facts).

### 3. Dashboard recent-bookings widget (`components/dashboard/data-table.tsx`)

**Visual parity refactor** — the user must not notice a difference:

- Keep: props contract (`rows`), status `Tabs`, column set, compact density,
  page size 10 default.
- Replace: bespoke `<Table>` markup → `AdminTableShell`; bespoke pagination footer
  (page-size `Select` + page buttons) → `ClientTablePagination`; the widget's own
  columns-dropdown (if any) → shared `ColumnsMenu`.
- Expected net: ~100 fewer lines; every admin table now renders through one shell.

## Out of scope

Any BE change · new features on either surface (search, export…) · other admin
surfaces (all already on-pattern) · web/mobile.

## Testing & process

- TDD: `lib/format-date.spec.ts` (null/invalid/valid). Everything else is visual —
  covered by `/gate` (lint · test · build) + user review on the Vercel deploy.
- Baselines: admin **146** tests (grows by the helper's cases) · api 314 · web 182.
- One branch, commits per task; gate → ⛔ user source review → rebase + `--ff-only`.
- Docs after merge: roadmap P4 row + CLAUDE.md admin row ("Remaining: UI polish" →
  done; P4 fully complete).

## Risks

- **Dashboard visual regression** — mitigated by keeping props/tabs/density and
  reviewing on the deploy preview.
- `ColumnsMenu` needs column `meta` labels — follow `posts-table.tsx`'s column defs
  exactly (the established client-table reference).
