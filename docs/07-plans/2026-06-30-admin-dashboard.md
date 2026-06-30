# Admin Dashboard (dashboard-01 parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the empty admin dashboard at `/` to match shadcn `dashboard-01` (KPI cards + interactive daily area chart + full data-table) wired to real DB data.

**Architecture:** One additive backend field (`dailyTrend`, 90 days) on the existing `GET /admin/stats/dashboard`. The Server Component page fetches stats + recent bookings in parallel and renders three client blocks built on `@tourism/ui` (Base UI). Pure transforms are TDD'd; visual/interaction is reviewed on the deploy.

**Tech Stack:** NestJS + Prisma (`$queryRaw`), Next.js 16 RSC, `@tourism/ui` (Base UI), `recharts` (+ `Chart*` wrapper), `@tanstack/react-table`, `@dnd-kit/*`, Jest.

## Global Constraints

- Node ≥ 22, pnpm 11. Run tasks via Nx (`pnpm nx <target> @tourism/<proj>`).
- Branch: `feat/admin-dashboard` (already created; spec committed there).
- Build UI on `@tourism/ui` only — **never** `npx shadcn add`. Base UI uses the `render` prop, **not** Radix `asChild`.
- Base UI footguns (crash the page): a `DropdownMenuItem` must NOT `render` a native `<button>` (use `onClick`, or `nativeButton`, or `nativeButton={false}` for a Link); `DropdownMenuLabel` only inside a `DropdownMenuGroup` (free-standing headers = plain `<div>`).
- No hex in authored CSS (tokens only; `pnpm check:no-hex`). Chart series colours come from CSS vars / token utilities.
- Drag-reorder and inline-edit are **view-only** (local React state, never persisted) — by design, not a TODO.
- TDD on pure logic, target ≥ 80% on new logic. Conventional Commits, no AI attribution.
- Run `/gate` (lint + typecheck + test + build) before declaring green.

---

### Task 1: Backend — `dailyTrend` (90-day daily series)

**Files:**
- Modify: `apps/api/src/modules/admin-stats/admin-stats.service.ts` (add a daily `$queryRaw` inside the existing `Promise.all`; map + return `dailyTrend`)
- Modify: `apps/api/src/modules/admin-stats/dto/admin-stats-response.dto.ts` (add `DailyTrendDto` + field)
- Test: `apps/api/src/modules/admin-stats/admin-stats.service.spec.ts`

**Interfaces:**
- Produces: response gains `dailyTrend: Array<{ date: string /* YYYY-MM-DD */, bookings: number, revenue: string }>`, ascending by date, revenue = sum of PAID `total_amount` that day.

- [ ] **Step 1: Write the failing test** — extend the existing service spec. Mirror the monthly-trend assertions. Add to `admin-stats.service.spec.ts`:

```typescript
it('returns a daily trend (ascending, PAID revenue only)', async () => {
  // The existing spec already mocks prisma.$queryRaw for the monthly rows; extend the
  // mock so the SECOND $queryRaw call (daily) resolves with a known row set.
  // (Match the file's existing mocking style — queueing $queryRaw resolved values.)
  const result = await service.getDashboard();

  expect(Array.isArray(result.dailyTrend)).toBe(true);
  // ascending by date
  const dates = result.dailyTrend.map((d) => d.date);
  expect([...dates].sort()).toEqual(dates);
  // shape
  for (const row of result.dailyTrend) {
    expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof row.bookings).toBe('number');
    expect(typeof row.revenue).toBe('string');
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @tourism/api --testPathPatterns=admin-stats.service`
Expected: FAIL — `result.dailyTrend` is undefined.

- [ ] **Step 3: Implement** — in `admin-stats.service.ts`, add a `DailyRow` type and a second raw query, run it inside the existing `Promise.all`, then map it. Model it on the monthly block (`date_trunc('month', …)` → use `'day'`; window `NOW() - INTERVAL '90 days'`):

```typescript
type DailyRow = { day: Date; bookings: bigint; revenue: string | null };

// inside the Promise.all array, alongside monthlyRows:
this.prisma.$queryRaw<DailyRow[]>`
  SELECT
    date_trunc('day', created_at) AS day,
    COUNT(*)::bigint AS bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0)::text AS revenue
  FROM bookings
  WHERE created_at >= (NOW() - INTERVAL '90 days')
  GROUP BY day
  ORDER BY day ASC
`,

// after destructuring `dailyRows` from the Promise.all results:
const dailyTrend = dailyRows.map((row) => ({
  date: row.day.toISOString().slice(0, 10),
  bookings: Number(row.bookings),
  revenue: row.revenue ?? '0',
}));

// add `dailyTrend` to the returned object and to the AdminStatsResponse type.
```

In `admin-stats-response.dto.ts` add:

```typescript
class DailyTrendDto {
  @ApiProperty({ example: '2026-06-30' })
  date!: string;

  @ApiProperty({ example: 3 })
  bookings!: number;

  @ApiProperty({ example: '450.00' })
  revenue!: string;
}
// on the response DTO class:
@ApiProperty({ type: [DailyTrendDto] })
dailyTrend!: DailyTrendDto[];
```

- [ ] **Step 4: Run tests** — `pnpm nx test @tourism/api --testPathPatterns=admin-stats.service` → PASS. Also `pnpm nx typecheck @tourism/api` → clean.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admin-stats
git commit -m "feat(api): add dailyTrend (90d) to admin dashboard stats"
```

---

### Task 2: FE data layer — stats fetch (recreate, with `dailyTrend`)

**Files:**
- Create: `apps/admin/src/lib/dashboard/stats.ts`

**Interfaces:**
- Produces: `getDashboardStats(): Promise<DashboardStats>` where `DashboardStats` includes the old fields **plus** `dailyTrend: { date: string; bookings: number; revenue: string }[]`.

- [ ] **Step 1: Implement** (recreate the file deleted in `6812b60`, adding `dailyTrend`). The FE declares the shape locally and unwraps the `{ data }` envelope:

```typescript
import { getApiClient } from '../api/client';

export interface DashboardStats {
  overview: {
    totalRevenue: string;
    currency: string;
    totalBookings: number;
    paidBookings: number;
    conversionRate: number;
    monthOverMonthGrowth: number | null;
  };
  bookingsByStatus: Record<'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED', number>;
  topToursByRevenue: { tourId: string; slug: string; title: string; revenue: string; bookingsCount: number }[];
  monthlyTrend: { month: string; bookings: number; revenue: string }[];
  dailyTrend: { date: string; bookings: number; revenue: string }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/stats/dashboard', {});
  return (data as unknown as { data: DashboardStats }).data;
}
```

- [ ] **Step 2: Typecheck** — `pnpm nx build @tourism/admin` (or lint) compiles. (No unit test — thin IO wrapper; covered by the transform tests next.)

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/lib/dashboard/stats.ts
git commit -m "feat(admin): dashboard stats fetch (+dailyTrend)"
```

---

### Task 3: FE data layer — recent bookings fetch

**Files:**
- Create: `apps/admin/src/lib/dashboard/bookings-table.ts`

**Interfaces:**
- Consumes: `GET /api/v1/admin/bookings` (paginated; row fields `code`, `status`, `totalAmount` (string), `currency`, `contactName`, `createdAt`, `tour: { slug, title }`).
- Produces: `getRecentBookings(limit = 50): Promise<AdminBookingRow[]>` and the exported `AdminBookingRow` type.

- [ ] **Step 1: Implement** (unwrap the list envelope; the list maps 1:1 — no `.data` double-unwrap for paginated lists per [admin-api-envelope] convention, but verify at runtime):

```typescript
import { getApiClient } from '../api/client';

export interface AdminBookingRow {
  code: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  totalAmount: string;
  currency: string;
  contactName: string;
  createdAt: string;
  tourTitle: string;
  tourSlug: string;
}

export async function getRecentBookings(limit = 50): Promise<AdminBookingRow[]> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/bookings', {
    params: { query: { page: 1, pageSize: limit } },
  });
  const rows = (data as unknown as { data: Array<Record<string, unknown>> }).data ?? [];
  return rows.map((b) => ({
    code: String(b.code),
    status: b.status as AdminBookingRow['status'],
    totalAmount: String(b.totalAmount ?? '0'),
    currency: String(b.currency ?? 'USD'),
    contactName: String(b.contactName ?? ''),
    createdAt: String(b.createdAt ?? ''),
    tourTitle: String((b.tour as { title?: string })?.title ?? ''),
    tourSlug: String((b.tour as { slug?: string })?.slug ?? ''),
  }));
}
```

- [ ] **Step 2: Typecheck** — `pnpm nx build @tourism/admin` compiles.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/lib/dashboard/bookings-table.ts
git commit -m "feat(admin): recent-bookings fetch for the dashboard table"
```

---

### Task 4: Pure transforms + formatters (TDD)

**Files:**
- Create: `apps/admin/src/lib/dashboard/transforms.ts`
- Test: `apps/admin/src/lib/dashboard/transforms.spec.ts`

**Interfaces:**
- Produces:
  - `sliceDailyTrend(daily: {date:string;bookings:number;revenue:string}[], range: '90d'|'30d'|'7d'): typeof daily` — last N entries (90/30/7).
  - `computeCardModels(overview, monthlyTrend): CardModel[]` where `CardModel = { key: string; label: string; value: string; delta: number | null }` (4 cards: revenue, bookings, conversion, aov).
  - `formatMoney(value: string|number, currency: string): string`, `formatPct(n: number): string`, `formatDay(iso: string): string`.

- [ ] **Step 1: Write failing tests**

```typescript
import { sliceDailyTrend, computeCardModels, formatMoney, formatPct } from './transforms';

const daily = Array.from({ length: 90 }, (_, i) => ({
  date: `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
  bookings: i,
  revenue: String(i * 10),
}));

test('sliceDailyTrend returns the last N days', () => {
  expect(sliceDailyTrend(daily, '7d')).toHaveLength(7);
  expect(sliceDailyTrend(daily, '30d')).toHaveLength(30);
  expect(sliceDailyTrend(daily, '90d')).toHaveLength(90);
  expect(sliceDailyTrend(daily, '7d')[6]).toEqual(daily[89]);
});

test('computeCardModels: revenue delta = monthOverMonthGrowth; conversion/aov have no delta', () => {
  const overview = { totalRevenue: '1000.00', currency: 'USD', totalBookings: 50, paidBookings: 40, conversionRate: 0.8, monthOverMonthGrowth: 0.25 };
  const monthly = [ { month: '2026-05', bookings: 20, revenue: '800' }, { month: '2026-06', bookings: 30, revenue: '1000' } ];
  const cards = computeCardModels(overview, monthly);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
  expect(byKey.revenue.delta).toBeCloseTo(0.25);
  expect(byKey.bookings.delta).toBeCloseTo(0.5); // 30 vs 20
  expect(byKey.conversion.delta).toBeNull();
  expect(byKey.aov.delta).toBeNull();
  expect(byKey.aov.value).toBe(formatMoney(25, 'USD')); // 1000 / 40
});

test('formatPct / formatMoney', () => {
  expect(formatPct(0.8)).toBe('80%');
  expect(formatMoney('1000', 'USD')).toMatch(/\$1,000/);
});
```

- [ ] **Step 2: Run to verify fail** — `pnpm nx test @tourism/admin --testPathPatterns=transforms` → FAIL (module not found).

- [ ] **Step 3: Implement `transforms.ts`**

```typescript
const RANGE_DAYS = { '90d': 90, '30d': 30, '7d': 7 } as const;

export function sliceDailyTrend<T>(daily: T[], range: keyof typeof RANGE_DAYS): T[] {
  return daily.slice(-RANGE_DAYS[range]);
}

export interface CardModel { key: string; label: string; value: string; delta: number | null }

interface Overview {
  totalRevenue: string; currency: string; totalBookings: number;
  paidBookings: number; conversionRate: number; monthOverMonthGrowth: number | null;
}

export function formatMoney(value: string | number, currency: string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number.isFinite(n) ? n : 0);
}
export function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function computeCardModels(
  overview: Overview,
  monthly: { month: string; bookings: number; revenue: string }[],
): CardModel[] {
  const bookingsDelta =
    monthly.length >= 2
      ? monthly[monthly.length - 2].bookings === 0
        ? null
        : monthly[monthly.length - 1].bookings / monthly[monthly.length - 2].bookings - 1
      : null;
  const aov = overview.paidBookings > 0 ? Number(overview.totalRevenue) / overview.paidBookings : 0;
  return [
    { key: 'revenue', label: 'Total revenue', value: formatMoney(overview.totalRevenue, overview.currency), delta: overview.monthOverMonthGrowth },
    { key: 'bookings', label: 'Bookings', value: String(overview.totalBookings), delta: bookingsDelta },
    { key: 'conversion', label: 'Conversion rate', value: formatPct(overview.conversionRate), delta: null },
    { key: 'aov', label: 'Avg order value', value: formatMoney(aov, overview.currency), delta: null },
  ];
}
```

- [ ] **Step 4: Run tests** → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/dashboard/transforms.ts apps/admin/src/lib/dashboard/transforms.spec.ts
git commit -m "feat(admin): dashboard pure transforms (slice/cards/format) — TDD"
```

---

### Task 5: Install table + dnd dependencies

**Files:**
- Modify: `apps/admin/package.json` (dependencies)

- [ ] **Step 1: Add deps** — edit `apps/admin/package.json` dependencies (alphabetical), then install:

```jsonc
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/modifiers": "^9.0.0",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2",
"@tanstack/react-table": "^8.21.3",
```

Run: `pnpm install`
Expected: resolves, adds the packages, no peer-dep errors that block.

- [ ] **Step 2: Commit**

```bash
git add apps/admin/package.json pnpm-lock.yaml
git commit -m "chore(admin): add @tanstack/react-table + @dnd-kit for the dashboard table"
```

---

### Task 6: SectionCards

**Files:**
- Create: `apps/admin/src/components/dashboard/section-cards.tsx`

**Interfaces:**
- Consumes: `computeCardModels` output (`CardModel[]`).
- Produces: `<SectionCards cards={CardModel[]} />`.

Reference (port the structure, retheme to tokens): `shadcn-ui/ui` → `apps/v4/registry/new-york-v4/blocks/dashboard-01/components/section-cards.tsx`. Read it for the card layout (CardHeader/CardDescription/CardTitle, a top-right `Badge` with a trending icon, `CardFooter` two-line). Rebuild with `@tourism/ui` `Card*` + `Badge`, plus lucide `TrendingUp` / `TrendingDown`.

- [ ] **Step 1: Implement** — a `'use client'`-free server component is fine (no interactivity). Grid of 4 cards; show the `Badge` chip only when `delta !== null`:

```tsx
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@tourism/ui';
import type { CardModel } from '../../lib/dashboard/transforms';

export function SectionCards({ cards }: { cards: CardModel[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
      {cards.map((c) => {
        const up = (c.delta ?? 0) >= 0;
        return (
          <Card key={c.key} className="@container/card">
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {c.value}
              </CardTitle>
              {c.delta !== null ? (
                <CardAction>
                  <Badge variant="outline">
                    {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {up ? '+' : ''}{Math.round(c.delta * 100)}%
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="text-muted-foreground flex-col items-start gap-1 text-sm">
              <span>{c.label} this period</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
export default SectionCards;
```

If `@tourism/ui` lacks `CardAction`, place the badge inside `CardHeader` with `ml-auto`. Verify the exact `Card*` exports by reading `libs/web/ui/src/components/ui/card.tsx`.

- [ ] **Step 2: Typecheck** — `pnpm nx build @tourism/admin` compiles.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/dashboard/section-cards.tsx
git commit -m "feat(admin): dashboard SectionCards (4 KPIs + trend badge)"
```

---

### Task 7: ChartAreaInteractive (daily area + 3m/30d/7d toggle)

**Files:**
- Create: `apps/admin/src/components/dashboard/chart-area-interactive.tsx`

**Interfaces:**
- Consumes: `DashboardStats['dailyTrend']` + `sliceDailyTrend`.
- Produces: `<ChartAreaInteractive daily={dailyTrend} />` (client component).

Reference: `dashboard-01/components/chart-area-interactive.tsx`. Read it for the `ChartContainer`/`ChartTooltip`/`AreaChart`/gradient `<defs>` + the range `ToggleGroup`(desktop)/`Select`(mobile) pattern. Confirm `@tourism/ui` chart exports by reading `libs/web/ui/src/components/ui/chart.tsx` (`ChartConfig`, `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`).

- [ ] **Step 1: Implement** — `'use client'`; `useState<'90d'|'30d'|'7d'>('90d')`; `const data = sliceDailyTrend(daily, range)`; render an `AreaChart` with two gradient areas (revenue, bookings). Colours via chart config using token vars (e.g. `var(--primary)` / `var(--chart-2)`), **no hex**. Range control: `ToggleGroup` on `sm+`, `Select` on mobile. Title "Revenue & bookings", subtitle "Last 90 days".

```tsx
'use client';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
  ToggleGroup, ToggleGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@tourism/ui';
import { sliceDailyTrend, formatDay } from '../../lib/dashboard/transforms';
import type { DashboardStats } from '../../lib/dashboard/stats';

const config = {
  revenue: { label: 'Revenue', color: 'var(--primary)' },
  bookings: { label: 'Bookings', color: 'var(--chart-2, var(--accent-foreground))' },
} satisfies ChartConfig;

export function ChartAreaInteractive({ daily }: { daily: DashboardStats['dailyTrend'] }) {
  const [range, setRange] = useState<'90d' | '30d' | '7d'>('90d');
  const data = sliceDailyTrend(daily, range).map((d) => ({ ...d, revenue: Number(d.revenue) }));
  // …header with ToggleGroup (sm+) + Select (mobile), both driving setRange…
  // …ChartContainer > AreaChart with <defs> linearGradient fills referencing the config colors,
  //   XAxis tickFormatter={formatDay}, ChartTooltip content={<ChartTooltipContent />}, two <Area> …
  return /* card + chart per dashboard-01, rethemed */ null as unknown as JSX.Element;
}
export default ChartAreaInteractive;
```

Fill the body by porting dashboard-01's chart JSX (gradients + two areas + axis + tooltip + the toggle/select header), swapping their `desktop/mobile` series for `revenue/bookings` and their `timeRange` state for `range`. **Base UI:** `ToggleGroup`/`Select` use the `render` prop, not `asChild`.

- [ ] **Step 2: Typecheck + lint + no-hex** — `pnpm nx lint @tourism/admin`, `pnpm nx build @tourism/admin`, `pnpm check:no-hex` all clean.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/dashboard/chart-area-interactive.tsx
git commit -m "feat(admin): dashboard interactive daily area chart (90/30/7d)"
```

---

### Task 8: DataTable — columns, status badges, base table

**Files:**
- Create: `apps/admin/src/components/dashboard/data-table.tsx`

**Interfaces:**
- Consumes: `AdminBookingRow[]`.
- Produces: `<DataTable rows={AdminBookingRow[]} />` (client component).

Reference: `dashboard-01/components/data-table.tsx` (large). Port incrementally across Tasks 8–12. This task: the TanStack table core + columns + status `Badge`, no tabs/dnd/drawer yet.

- [ ] **Step 1: Implement base table** — `'use client'`; `useReactTable` with `getCoreRowModel`; columns: select checkbox, drag-placeholder (empty for now), `code`, `tourTitle`, `status` (render a `Badge` whose variant maps status → PAID=default/emerald, PENDING=outline, CANCELLED=secondary, REFUNDED=destructive), `contactName`, `totalAmount` (via `formatMoney`), `createdAt` (via `formatDay`). Render with `@tourism/ui` `Table/TableHeader/TableBody/TableRow/TableCell`. Use `Checkbox` for row select.

```tsx
'use client';
import { Badge, Checkbox, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@tourism/ui';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { formatDay, formatMoney } from '../../lib/dashboard/transforms';
import type { AdminBookingRow } from '../../lib/dashboard/bookings-table';

const STATUS_VARIANT: Record<AdminBookingRow['status'], 'default' | 'outline' | 'secondary' | 'destructive'> = {
  PAID: 'default', PENDING: 'outline', CANCELLED: 'secondary', REFUNDED: 'destructive',
};
// columns: ColumnDef<AdminBookingRow>[] = [ … ]
// const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
// render <Table> from table.getHeaderGroups()/getRowModel()
```

- [ ] **Step 2: Typecheck + lint** clean. **Empty state:** if `rows.length === 0`, render a single full-width "No bookings yet" row.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/dashboard/data-table.tsx
git commit -m "feat(admin): dashboard data-table — columns + status badges"
```

---

### Task 9: DataTable — status tabs (with counts) + pagination + column visibility

- [ ] **Step 1: Add status tabs** — `Tabs` above the table: `All / Paid / Pending / Cancelled / Refunded`, each trigger shows a count `Badge` (count from the rows). Selecting a tab sets a column filter on `status` (TanStack `getFilteredRowModel`). "All" clears it.
- [ ] **Step 2: Pagination** — `getPaginationRowModel`, 10 rows/page; footer with rows-per-page `Select` (10/20/30) + first/prev/next/last buttons + "Showing X–Y of Z". Reuse the look of `@tourism/ui` `Pagination` where practical.
- [ ] **Step 3: Column visibility** — a "Columns" `DropdownMenu` with a `DropdownMenuCheckboxItem` per hideable column (`table.getAllColumns().filter(c => c.getCanHide())`). **Footgun:** items are `DropdownMenuCheckboxItem`/`onClick` — never `render={<button>}`; any free-standing header is a plain `<div>`, not `DropdownMenuLabel`.
- [ ] **Step 4: Typecheck + lint** clean.
- [ ] **Step 5: Commit** — `git commit -m "feat(admin): dashboard data-table — tabs, pagination, column visibility"`

---

### Task 10: DataTable — drag-reorder + inline edit (view-only)

- [ ] **Step 1: Drag-reorder rows** — wrap the body in dnd-kit `DndContext` + `SortableContext` (verticalListSortingStrategy, `restrictToVerticalAxis`); a drag-handle cell per row via `useSortable`; `onDragEnd` reorders a local `useState` copy of the rows (`arrayMove`). Persists nothing (by design).
- [ ] **Step 2: Inline edit** — make `tourTitle`/`totalAmount` cells editable: click → `<Input>`; on blur/Enter, update the **local** rows state only. No API call (view-only).
- [ ] **Step 3: Typecheck + lint** clean.
- [ ] **Step 4: Commit** — `git commit -m "feat(admin): dashboard data-table — drag-reorder + inline edit (view-only)"`

---

### Task 11: DataTable — row-detail Drawer

- [ ] **Step 1: Row drawer** — clicking the booking `code` opens a `@tourism/ui` `Drawer` summarising the booking (code, tour, status badge, customer, amount, created) + a link to `/account/...`? No — admin has no booking detail page yet, so the drawer is read-only summary only (note: a future task wires it to a real admin booking page). **Base UI:** `Drawer` uses `render`, not `asChild`.
- [ ] **Step 2: Typecheck + lint** clean.
- [ ] **Step 3: Commit** — `git commit -m "feat(admin): dashboard data-table — row-detail drawer"`

---

### Task 12: Page assembly + error/empty states + tab title

**Files:**
- Modify: `apps/admin/src/app/(admin)/page.tsx` (assemble the three blocks)
- Modify: `apps/admin/src/app/layout.tsx` (metadata title `Tourism Admin` → Nexora)

- [ ] **Step 1: Assemble the page** — Server Component; fetch in parallel and render; wrap each fetch so a failure renders a calm error block instead of throwing:

```tsx
import { getDashboardStats } from '../../lib/dashboard/stats';
import { getRecentBookings } from '../../lib/dashboard/bookings-table';
import { computeCardModels } from '../../lib/dashboard/transforms';
import { SectionCards } from '../../components/dashboard/section-cards';
import { ChartAreaInteractive } from '../../components/dashboard/chart-area-interactive';
import { DataTable } from '../../components/dashboard/data-table';

export default async function DashboardPage() {
  const [stats, bookings] = await Promise.all([
    getDashboardStats().catch(() => null),
    getRecentBookings(50).catch(() => null),
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {stats ? (
        <>
          <SectionCards cards={computeCardModels(stats.overview, stats.monthlyTrend)} />
          <div className="px-4 lg:px-6"><ChartAreaInteractive daily={stats.dailyTrend} /></div>
        </>
      ) : (
        <div className="mx-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive lg:mx-6">
          Couldn’t load stats. The API may be waking up — refresh in a moment.
        </div>
      )}
      <div className="px-4 lg:px-6">
        <DataTable rows={bookings ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tab title** — in `apps/admin/src/app/layout.tsx`, change `metadata.title` from `'Tourism Admin'` to `'Nexora Console'` and `description` to a Nexora line.

- [ ] **Step 3: Build** — `pnpm nx build @tourism/admin` clean.

- [ ] **Step 4: Commit**

```bash
git add "apps/admin/src/app/(admin)/page.tsx" apps/admin/src/app/layout.tsx
git commit -m "feat(admin): assemble dashboard + error states + Nexora tab title"
```

---

### Task 13: Gate + manual review

- [ ] **Step 1: Gate** — `pnpm nx run-many -t lint typecheck test build -p @tourism/admin @tourism/api` (or `/gate`). All green. `pnpm check:no-hex` clean.
- [ ] **Step 2: Manual review** — build + `next start apps/admin` locally OR push the branch and review on the Vercel preview: cards show real numbers, chart toggles 90/30/7d, table tabs/pagination/column-vis/drag/edit/drawer all work and **do not crash** (Base UI footguns avoided).
- [ ] **Step 3:** Open PR / merge per the user's flow (confirm before merge/push).

---

## Notes for the implementer

- Read the three dashboard-01 source files before porting (exact paths under `shadcn-ui/ui` → `apps/v4/registry/new-york-v4/blocks/dashboard-01/components/`): `section-cards.tsx`, `chart-area-interactive.tsx`, `data-table.tsx`. They are Radix-based — **port the structure, rebuild on `@tourism/ui`** (Base UI `render` prop).
- Verify exact `@tourism/ui` exports by reading the source under `libs/web/ui/src/components/ui/` (`card.tsx`, `chart.tsx`, `table.tsx`, `tabs.tsx`, `drawer.tsx`, `badge.tsx`, `checkbox.tsx`, `select.tsx`, `toggle-group.tsx`, `dropdown-menu.tsx`).
- Any `DropdownMenu` usage: obey the Base UI footguns (Global Constraints) — these crashed the page once already.
- Keep each component file focused (< ~250 lines). If `data-table.tsx` grows large, split row/cell/columns into sibling files.
