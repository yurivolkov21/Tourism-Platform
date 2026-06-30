# Spec — Admin Dashboard redesign (dashboard-01 parity, real data)

**Date:** 2026-06-30 · **Phase:** P4 admin UI redesign · **Status:** approved design →
plan next · **Branch:** `feat/admin-dashboard` (to create)

Rebuild the admin dashboard (`apps/admin/src/app/(admin)/page.tsx`, currently an
empty placeholder) to match shadcn **`dashboard-01`** as closely as possible,
wired to the project's real Postgres data. Built on `@tourism/ui` (Base UI) — we
read dashboard-01's structure from `shadcn-ui/ui` and re-implement, we do **not**
`npx shadcn add` (Base UI ≠ Radix; raw install conflicts with the design system
and module boundaries, and reintroduces the `nativeButton`/group footguns).

## Goals

- Visual + interaction parity with dashboard-01: **SectionCards** (4 KPI cards
  with trend badges) + **ChartAreaInteractive** (daily area chart with a
  3-months / 30-days / 7-days range toggle) + **DataTable** (tabs, drag-to-reorder
  rows, inline-edit cells, column visibility, row selection, pagination, row-detail
  drawer).
- All numbers come from the real DB. No fake/seed demo rows in the UI.
- Reuse the existing backend stats endpoint; one **additive** backend change only.

## Non-goals

- No donut/pie (dashboard-01 has none — Cards + Chart + Table only).
- No new admin routes. The dashboard stays at `/` inside the `(admin)` shell.
- Drag-reorder and inline-edit are **view-only** (local React state, not
  persisted) — identical to the dashboard-01 demo, which also persists nothing.
  This is intentional and called out in the UI/spec, not a TODO.
- Not touching the shell, sidebar, or other pages.

## Backend change (additive, one query)

`GET /admin/stats/dashboard` (`apps/api/src/modules/admin-stats`) already returns
`overview`, `bookingsByStatus`, `topToursBy*`, and `monthlyTrend` (6 months via
`$queryRaw` `date_trunc('month', created_at)`).

Add a **`dailyTrend`** field: bookings + PAID revenue per day for the **last 90
days**, so the FE toggle can slice to 90/30/7 client-side (dashboard-01 fetches
the widest range once and slices in the browser).

- Service: a second `$queryRaw` mirroring the monthly one but
  `date_trunc('day', created_at)` with `WHERE created_at >= (NOW() - INTERVAL '90 days')`,
  run inside the existing `Promise.all` (pooler-safe). Map to
  `{ date: 'YYYY-MM-DD', bookings: number, revenue: string }`.
- DTO: add `class DailyTrendDto { date: string; bookings: number; revenue: string }`
  and `dailyTrend!: DailyTrendDto[]` on the response DTO (`admin-stats-response.dto.ts`).
- Tests: extend `admin-stats.service.spec.ts` — assert daily rows shape, ordering
  (ascending by date), and revenue counts PAID only (mirror the monthly assertions).
- After merge: run `/regen-types` so `@tourism/core` picks up `dailyTrend`.

No new endpoint, no breaking change to existing fields.

## Frontend architecture

`(admin)/page.tsx` (Server Component) fetches in parallel and renders the three
blocks. Two data sources:

1. `GET /admin/stats/dashboard` → cards + chart (recreate `lib/dashboard/stats.ts`,
   deleted in `6812b60`; same `getDashboardStats()` shape + the new `dailyTrend`).
2. `GET /admin/bookings?page=1&pageSize=50` → the data-table rows (new
   `lib/dashboard/bookings-table.ts` → `getRecentBookings()`). `GET /admin/bookings`
   is the existing paginated admin endpoint (`A-BKG-1`).

GET fetches use the existing authed client (`lib/api/client.ts`); GET is not
affected by the undici-body deploy gotcha (that was POST/PATCH-with-body).

### New dependencies (admin only)

`@tanstack/react-table` (headless table: sorting, filtering, column visibility,
pagination, row selection) and `@dnd-kit/core` + `@dnd-kit/sortable` +
`@dnd-kit/modifiers` + `@dnd-kit/utilities` (row drag-reorder). `recharts` (3.8.0)
and the `Chart*` wrapper in `@tourism/ui` are already present.

### Components (`apps/admin/src/components/dashboard/`)

| File | Role | dashboard-01 analog |
| --- | --- | --- |
| `section-cards.tsx` | 4 KPI cards: Revenue · Bookings · Conversion · AOV, each with value + `Badge` trend chip + footer line | `section-cards.tsx` |
| `chart-area-interactive.tsx` | Gradient area chart of daily revenue/bookings + 3m/30d/7d `ToggleGroup` (desktop) / `Select` (mobile) | `chart-area-interactive.tsx` |
| `data-table.tsx` | Recent-bookings table: TanStack + dnd-kit, status tabs w/ counts, column-visibility menu, row selection, pagination, row-detail `Drawer` | `data-table.tsx` |
| `dashboard-data.ts` (lib) | Pure transforms (below), TDD'd | inline in their files |

### Data mapping

**Cards** (from `overview` + `monthlyTrend`):

| Card | Value | Trend badge |
| --- | --- | --- |
| Total revenue | `overview.totalRevenue` (USD) | `monthOverMonthGrowth` ↑/↓ |
| Bookings | `overview.totalBookings` | MoM delta from `monthlyTrend` bookings (last vs prev) |
| Conversion rate | `overview.conversionRate` (× 100 %) | value only (no historical delta available) |
| Avg order value | `totalRevenue / paidBookings` | value only |

Cards without a real historical delta show the metric without a trend chip (we do
not fabricate a delta). All four keep dashboard-01's card layout (heading, big
number, top-right chip slot, two footer lines).

**Chart** (from `dailyTrend`): X = date, two series (revenue area + bookings area),
emerald-tinted gradient fills via tokens. Toggle slices the 90-day array to the
last 90 / 30 / 7 days client-side.

**Table** (from `GET /admin/bookings` rows):

| Column | Source | Notes |
| --- | --- | --- |
| (drag handle) | — | dnd-kit sortable handle |
| Code | `booking.code` | links to row drawer |
| Tour | `booking.tour.title` | |
| Status | `booking.status` | `Badge` w/ icon (PAID/PENDING/CANCELLED/REFUNDED) |
| Travellers | seats/pax | inline-editable (view-only) |
| Amount | `booking.totalAmount` + currency | inline-editable (view-only) |
| Created | `booking.createdAt` | formatted date |

Tabs = status filter with live counts (All / Paid / Pending / Cancelled / Refunded),
counts from `bookingsByStatus` or derived from the fetched rows.

### Pure logic (TDD, ≥80% on new logic)

In `lib/dashboard/`:

- `sliceDailyTrend(daily, range: '90d'|'30d'|'7d')` → tail slice.
- `computeCardModels(overview, monthlyTrend)` → the 4 card view-models incl. deltas.
- `toBookingRows(apiBookings)` → table row view-models.
- `formatMoney(value, currency)`, `formatPct(n)`, `formatDay(date)`.

Visual/interaction (drag, drawer, column-vis) covered by manual review on the
deploy, per project convention (layout-first; e2e optional).

## Error / empty / loading

- API asleep (Render free) or error → each block renders a calm empty/error state
  (no crash); the page never throws. Mirror the prior dashboard's error box.
- Zero data (fresh DB) → cards show 0/—, chart shows an empty baseline, table shows
  an empty state row.

## Base UI footguns to respect

- `DropdownMenuItem` (column-visibility menu, row actions) must NOT `render` a
  native `<button>` (Base UI `nativeButton` #31) — use `onClick`, or `nativeButton`
  for a real button, or `nativeButton={false}` for a Link.
- `DropdownMenuLabel` only inside a `DropdownMenuGroup`; free-standing headers use a
  plain `<div>`.
- Tabs / Drawer / Checkbox / Select / ToggleGroup are Base UI — use the `render`
  prop, never Radix `asChild`.

## File / task breakdown (for the plan)

1. **BE**: `dailyTrend` query + DTO + service test; `/regen-types`.
2. **FE data layer**: recreate `lib/dashboard/stats.ts` (+ `dailyTrend`), add
   `lib/dashboard/bookings-table.ts`, add pure transforms + specs.
3. **SectionCards**.
4. **ChartAreaInteractive** (+ toggle).
5. **DataTable** — sub-steps: columns + status `Badge` → status tabs + counts →
   column-visibility + row-selection + pagination → dnd-kit drag-reorder → inline
   edit (local state) → row-detail `Drawer`.
6. **Page assembly** + error/empty states + tab-title fix (`layout.tsx` metadata
   `Tourism Admin` → Nexora, folded in here).
7. `/gate` (lint + typecheck + test + build) + manual review on deploy.

## Out of scope / follow-ups

- Persisting drag-order or inline edits (would need new mutations — not now).
- Daily granularity beyond 90 days; custom date ranges.
- Replacing the table source with top-tours (we chose recent bookings).
