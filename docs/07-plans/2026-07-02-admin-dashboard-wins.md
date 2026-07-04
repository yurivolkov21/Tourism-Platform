# Admin Dashboard quick wins (Wave 4) — implementation plan

**STATUS: COMPLETE (2026-07-02)** — both slices executed via subagent-driven development and
ff-merged to `main`: slice 1 `6bf0b93` (BE `pendingCounts` on the stats aggregate,
`ecc:code-reviewer` APPROVE 0 findings — Promise.all alignment + index-backed counts verified) ·
slice 2 `8b0d98e` (chart Revenue|Bookings metric toggle · BookingsPipeline · TopToursCard tabs ·
NeedsAttention tiles · full `DashboardStats` typing + deploy-lag guards). Gate green per slice;
api tests 249, admin tests 124. Deferred follow-ups noted in the SDD ledger: TopToursCard USD
hardcode (multi-currency later), tablist keyboard-nav ARIA.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every stat the dashboard endpoint already computes (top-tours ×3, bookings-by-status, dailyTrend.bookings) plus new pending-queue tiles — per spec `docs/06-specs/2026-07-02-admin-dashboard-wins-design.md` (Wave 4).

**Architecture:** 2 slices. Slice 1: tiny additive BE — `pendingCounts {reviews, enquiries}` joins the existing `Promise.all` in the stats aggregator; regen. Slice 2: FE — chart gains a Revenue|Bookings metric toggle; a new 3-card row (BookingsPipeline · TopToursCard with internal tabs · NeedsAttention tiles) lands between the chart and the recent-bookings table; `DashboardStats` typing catches up with the payload.

**Tech Stack:** NestJS 11 + Prisma (api) · Next.js 16 admin · recharts via `@tourism/ui` Chart primitives · jest.

## Global Constraints

- **Deploy-lag guards:** `getDashboardStats` is the single choke point — `topToursByRating ?? []`, `topToursByWishlist ?? []`, `pendingCounts ?? null` (mirror the existing `dailyTrend ?? []`); the NeedsAttention card is hidden when `pendingCounts` is null.
- **Chart colors are tokens:** `var(--primary)` (revenue) and `var(--chart-2)` (bookings — defined in `libs/shared/tokens/generated/tokens.css:138`). No hex anywhere.
- **No stacking:** the chart shows ONE metric at a time (in-code scale rationale stands).
- SectionCards + DataTable untouched. Relative imports; Conventional Commits, no AI attribution; do NOT stage unrelated dirty files (docs/*.md, playground.md).
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. Slice 1 → `ecc:code-reviewer`. Merging after a green slice is pre-authorized; pause only on CRITICAL/HIGH findings.

---

# Slice 1 — BE: `pendingCounts`

Branch off `main`: `git checkout -b feat/admin-dashboard-wins-be`

### Task 1: `pendingCounts` on the stats aggregate (TDD)

**Files:**

- Modify: `apps/api/src/modules/admin-stats/dto/admin-stats-response.dto.ts`
- Modify: `apps/api/src/modules/admin-stats/admin-stats.service.ts` (interface ~line 5, `Promise.all` ~line 78, return mapping ~line 220+)
- Test: `apps/api/src/modules/admin-stats/admin-stats.service.spec.ts`

**Interfaces:**

- Produces: `AdminStatsResponse.pendingCounts: { reviews: number; enquiries: number }` (Swagger `PendingCountsDto`). Task 2 regenerates FE types; Task 3/4 consume via `DashboardStats.pendingCounts`.

- [ ] **Step 1: Write the failing test** — append inside the existing `describe` in `admin-stats.service.spec.ts`:

```ts
  it('returns pending queue counts (unapproved reviews + NEW enquiries)', async () => {
    const svc = new AdminStatsService(
      makePrisma({ pendingReviews: 3, newEnquiries: 5 }) as never,
    );
    const result = await svc.getDashboard();
    expect(result.pendingCounts).toEqual({ reviews: 3, enquiries: 5 });
  });
```

Extend the spec's `makePrisma` helper: add `pendingReviews?: number; newEnquiries?: number;` to its `opts` type; in the returned object, add `count: jest.fn().mockResolvedValue(opts.pendingReviews ?? 0)` to the EXISTING `review` member (it already stubs `review.groupBy`) and a new `enquiry: { count: jest.fn().mockResolvedValue(opts.newEnquiries ?? 0) }` member.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/api`
Expected: the new test FAILS (`pendingCounts` undefined); every other test still passes (the zero-defaults keep them green).

- [ ] **Step 3: DTO** — in `admin-stats-response.dto.ts` add (above `AdminStatsResponseDto`):

```ts
class PendingCountsDto {
  @ApiProperty({ example: 3, description: 'Reviews awaiting approval' })
  reviews!: number;

  @ApiProperty({ example: 5, description: 'Enquiries still in the NEW pipeline stage' })
  enquiries!: number;
}
```

and on `AdminStatsResponseDto`:

```ts
  @ApiProperty({ type: PendingCountsDto })
  pendingCounts!: PendingCountsDto;
```

- [ ] **Step 4: Service** — in `admin-stats.service.ts`: add `EnquiryStatus` to the `@prisma/client` import; extend the `AdminStatsResponse` interface with

```ts
  pendingCounts: { reviews: number; enquiries: number };
```

append two entries to the `Promise.all` array (after the daily `$queryRaw`):

```ts
      this.prisma.review.count({ where: { isApproved: false } }),
      this.prisma.enquiry.count({ where: { status: EnquiryStatus.NEW } }),
```

destructure them as `pendingReviews,` and `newEnquiries,` (append to the destructuring list in the same order), and add to the returned object:

```ts
      pendingCounts: { reviews: pendingReviews, enquiries: newEnquiries },
```

- [ ] **Step 5: Run to verify green**

Run: `pnpm nx test @tourism/api`
Expected: PASS (249 = 248 prior + 1 new).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/admin-stats
git commit -m "feat(api): pending queue counts on the admin dashboard stats"
```

### Task 2: Regen types + slice-1 gate/review/merge

- [ ] **Step 1:** Boot the API (`pnpm nx serve @tourism/api` background; poll `http://localhost:3000/api/docs-json` to 200), `pnpm nx run @tourism/core:api-types`, kill the server tree (PID via port 3000).
- [ ] **Step 2:** Verify the schema diff contains ONLY `PendingCountsDto` + `pendingCounts` on `AdminStatsResponseDto`.
- [ ] **Step 3:** `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` — PASS.
- [ ] **Step 4:** Commit: `git add libs/shared/core/src/lib/api/schema.ts && git commit -m "chore(core): regen API types (dashboard pendingCounts)"`.
- [ ] **Step 5:** Gate → green; `ecc:code-reviewer` on the branch diff (read-only counts on an ADMIN-gated route; verify no public exposure and the two counts are cheap indexed queries). Fix CRITICAL/HIGH.
- [ ] **Step 6:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-dashboard-wins-be && git push origin main && git branch -d feat/admin-dashboard-wins-be`.

---

# Slice 2 — Admin FE: chart toggle + widget row

Branch off `main`: `git checkout -b feat/admin-dashboard-wins-fe`

### Task 3: `bookingsPipeline` transform (TDD) + `DashboardStats` typing

**Files:**

- Modify: `apps/admin/src/lib/dashboard/transforms.ts`
- Modify: `apps/admin/src/lib/dashboard/stats.ts`
- Test: `apps/admin/src/lib/dashboard/transforms.spec.ts` (exists — append)

**Interfaces:**

- Produces: `bookingsPipeline(byStatus: Record<PipelineStatus, number>): PipelineRow[]` where `PipelineRow = { status: PipelineStatus; label: string; count: number; pct: number }` and `PIPELINE_ORDER = ['PENDING','PAID','CANCELLED','REFUNDED']`; `DashboardStats` gains `topToursByRating[]`, `topToursByWishlist[]`, `pendingCounts | null`. Task 4 consumes all of it.

- [ ] **Step 1: Write the failing tests** — append to `transforms.spec.ts`:

```ts
describe('bookingsPipeline', () => {
  it('returns the four statuses in fixed order with shares of the total', () => {
    const rows = bookingsPipeline({ PENDING: 1, PAID: 3, CANCELLED: 0, REFUNDED: 0 });
    expect(rows.map((r) => r.status)).toEqual(['PENDING', 'PAID', 'CANCELLED', 'REFUNDED']);
    expect(rows[1]).toEqual({ status: 'PAID', label: 'Paid', count: 3, pct: 0.75 });
  });

  it('is zero-safe when there are no bookings', () => {
    const rows = bookingsPipeline({ PENDING: 0, PAID: 0, CANCELLED: 0, REFUNDED: 0 });
    expect(rows.every((r) => r.count === 0 && r.pct === 0)).toBe(true);
  });
});
```

(Add `bookingsPipeline` to the file's import from `./transforms`.)

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm nx test @tourism/admin`
Expected: FAIL — `bookingsPipeline` is not exported.

- [ ] **Step 3: Implement** — append to `transforms.ts`:

```ts
export const PIPELINE_ORDER = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'] as const;
export type PipelineStatus = (typeof PIPELINE_ORDER)[number];

export interface PipelineRow {
  status: PipelineStatus;
  label: string;
  count: number;
  /** Share of all bookings, 0..1 (0 when there are none). */
  pct: number;
}

const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

/** Fixed-order status breakdown with each status's share of the total (zero-safe). */
export function bookingsPipeline(byStatus: Record<PipelineStatus, number>): PipelineRow[] {
  const total = PIPELINE_ORDER.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
  return PIPELINE_ORDER.map((status) => {
    const count = byStatus[status] ?? 0;
    return {
      status,
      label: PIPELINE_LABEL[status],
      count,
      pct: total === 0 ? 0 : count / total,
    };
  });
}
```

- [ ] **Step 4:** `stats.ts` — extend the `DashboardStats` interface (after `topToursByRevenue`):

```ts
  topToursByRating: {
    tourId: string;
    slug: string;
    title: string;
    averageRating: number;
    reviewsCount: number;
  }[];
  topToursByWishlist: { tourId: string; slug: string; title: string; wishlistCount: number }[];
  pendingCounts: { reviews: number; enquiries: number } | null;
```

and widen the guards in `getDashboardStats` (replacing the current return):

```ts
  // New BE fields — default them so the dashboard never crashes against an API
  // instance that hasn't shipped them yet (e.g. a fresh FE hitting a lagging Render).
  return {
    ...payload,
    dailyTrend: payload.dailyTrend ?? [],
    topToursByRating: payload.topToursByRating ?? [],
    topToursByWishlist: payload.topToursByWishlist ?? [],
    pendingCounts: payload.pendingCounts ?? null,
  };
```

- [ ] **Step 5: Run to verify green**

Run: `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin`
Expected: PASS (124 = 122 prior + 2 new).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/dashboard/transforms.ts apps/admin/src/lib/dashboard/transforms.spec.ts apps/admin/src/lib/dashboard/stats.ts
git commit -m "feat(admin): bookings pipeline transform + full dashboard stats typing"
```

### Task 4: Chart metric toggle + widget cards + page composition

**Files:**

- Modify: `apps/admin/src/components/dashboard/chart-area-interactive.tsx`
- Create: `apps/admin/src/components/dashboard/bookings-pipeline.tsx`
- Create: `apps/admin/src/components/dashboard/top-tours-card.tsx`
- Create: `apps/admin/src/components/dashboard/needs-attention.tsx`
- Modify: `apps/admin/src/app/(admin)/page.tsx`

**Interfaces:**

- Consumes: `bookingsPipeline`/`PipelineStatus`, `formatMoney` (existing transform), `DashboardStats` fields from Task 3.
- Produces: `BookingsPipeline({ byStatus })` · `TopToursCard({ byRevenue, byRating, byWishlist })` · `NeedsAttention({ counts })`.

- [ ] **Step 1: Chart metric toggle** — in `chart-area-interactive.tsx`:

Replace the `chartConfig` block (keep the scale-rationale comment, updated):

```ts
// Revenue and bookings live on different scales (single digits vs $ hundreds), so they are never
// stacked — the toggle shows ONE metric at a time instead.
const chartConfig = {
  revenue: { label: 'Revenue', color: 'var(--primary)' },
  bookings: { label: 'Bookings', color: 'var(--chart-2)' },
} satisfies ChartConfig;

type Metric = keyof typeof chartConfig;

const METRIC_META: Record<Metric, { title: string; blurb: string }> = {
  revenue: { title: 'Revenue', blurb: 'Paid revenue' },
  bookings: { title: 'Bookings', blurb: 'Bookings created' },
};
```

Inside the component: add `const [metric, setMetric] = useState<Metric>('revenue');`, build both series into the data points:

```ts
  const data = sliceDailyTrend(daily, range).map((d) => ({
    date: d.date,
    revenue: Number(d.revenue),
    bookings: d.bookings,
  }));
```

`CardTitle` renders `{METRIC_META[metric].title}`; the long description becomes `` {`${METRIC_META[metric].blurb} — ${RANGE_LABEL[range].toLowerCase()}`} ``. In `CardAction`, ABOVE the existing range ToggleGroup, add a metric toggle (always visible):

```tsx
          <ToggleGroup
            value={[metric]}
            onValueChange={(v) => {
              const next = v[0] as Metric | undefined;
              if (next) setMetric(next);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="revenue" className="px-3">Revenue</ToggleGroupItem>
            <ToggleGroupItem value="bookings" className="px-3">Bookings</ToggleGroupItem>
          </ToggleGroup>
```

(Wrap both toggles + the mobile Select in `CardAction` with `<div className="flex flex-wrap items-center gap-2">…</div>`.) The gradient + Area switch on the metric — replace the `<defs>` + `<Area>`:

```tsx
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={1.0} />
                <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.1} />
              </linearGradient>
            </defs>
```

```tsx
            <Area
              key={metric}
              dataKey={metric}
              type="monotone"
              fill={`url(#fill-${metric})`}
              stroke={`var(--color-${metric})`}
            />
```

- [ ] **Step 2: `bookings-pipeline.tsx`** (server component):

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tourism/ui';

import {
  bookingsPipeline,
  type PipelineStatus,
} from '../../lib/dashboard/transforms';

const DOT_CLASS: Record<PipelineStatus, string> = {
  PENDING: 'bg-amber-500',
  PAID: 'bg-emerald-600',
  CANCELLED: 'bg-muted-foreground',
  REFUNDED: 'bg-sky-600',
};

/** Bookings-by-status breakdown — counts + share bars in a fixed pipeline order. */
export function BookingsPipeline({ byStatus }: { byStatus: Record<PipelineStatus, number> }) {
  const rows = bookingsPipeline(byStatus);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bookings pipeline</CardTitle>
        <CardDescription>All bookings to date, by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.status} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className={`size-2 rounded-full ${DOT_CLASS[row.status]}`} aria-hidden />
                {row.label}
              </span>
              <span className="font-medium tabular-nums">{row.count}</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${DOT_CLASS[row.status]}`}
                style={{ width: `${Math.round(row.pct * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default BookingsPipeline;
```

- [ ] **Step 3: `top-tours-card.tsx`** (client — tab state):

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Star } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@tourism/ui';

import { formatMoney } from '../../lib/dashboard/transforms';
import type { DashboardStats } from '../../lib/dashboard/stats';

type TabKey = 'revenue' | 'rating' | 'wishlist';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'rating', label: 'Rating' },
  { key: 'wishlist', label: 'Wishlisted' },
];

function RowShell({ slug, title, right }: { slug: string; title: string; right: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 text-sm">
      <Link
        href={`/tours/${slug}`}
        title={title}
        className="hover:text-primary min-w-0 truncate font-medium hover:underline"
      >
        {title}
      </Link>
      <span className="text-muted-foreground shrink-0 tabular-nums">{right}</span>
    </li>
  );
}

/** Top-5 tours, tabbed across the three rankings the stats endpoint returns. */
export function TopToursCard({
  byRevenue,
  byRating,
  byWishlist,
}: {
  byRevenue: DashboardStats['topToursByRevenue'];
  byRating: DashboardStats['topToursByRating'];
  byWishlist: DashboardStats['topToursByWishlist'];
}) {
  const [tab, setTab] = useState<TabKey>('revenue');

  const empty = <p className="text-muted-foreground py-4 text-center text-sm">No data yet.</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top tours</CardTitle>
        <CardDescription>Best performers across the catalog.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg p-1"
        >
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex h-6 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                  isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'revenue' &&
          (byRevenue.length ? (
            <ul className="space-y-2.5">
              {byRevenue.map((t) => (
                <RowShell
                  key={t.tourId}
                  slug={t.slug}
                  title={t.title}
                  right={`${formatMoney(t.revenue, 'USD')} · ${t.bookingsCount} bookings`}
                />
              ))}
            </ul>
          ) : (
            empty
          ))}
        {tab === 'rating' &&
          (byRating.length ? (
            <ul className="space-y-2.5">
              {byRating.map((t) => (
                <RowShell
                  key={t.tourId}
                  slug={t.slug}
                  title={t.title}
                  right={
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-current text-amber-500" aria-hidden />
                      {t.averageRating.toFixed(1)} · {t.reviewsCount} reviews
                    </span>
                  }
                />
              ))}
            </ul>
          ) : (
            empty
          ))}
        {tab === 'wishlist' &&
          (byWishlist.length ? (
            <ul className="space-y-2.5">
              {byWishlist.map((t) => (
                <RowShell
                  key={t.tourId}
                  slug={t.slug}
                  title={t.title}
                  right={`${t.wishlistCount} saves`}
                />
              ))}
            </ul>
          ) : (
            empty
          ))}
      </CardContent>
    </Card>
  );
}

export default TopToursCard;
```

- [ ] **Step 4: `needs-attention.tsx`** (server component):

```tsx
import Link from 'next/link';
import { ArrowRight, Inbox, MessageSquareQuote } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tourism/ui';

/** Operational queues — what's waiting on an admin right now. */
export function NeedsAttention({ counts }: { counts: { reviews: number; enquiries: number } }) {
  const tiles = [
    {
      key: 'reviews',
      label: 'Pending reviews',
      count: counts.reviews,
      href: '/reviews',
      icon: MessageSquareQuote,
      blurb: 'awaiting approval',
    },
    {
      key: 'enquiries',
      label: 'New enquiries',
      count: counts.enquiries,
      href: '/enquiries?status=NEW',
      icon: Inbox,
      blurb: 'not yet contacted',
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Needs attention</CardTitle>
        <CardDescription>Queues waiting on you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const allClear = tile.count === 0;
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className="hover:bg-muted/60 group flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Icon className="text-muted-foreground size-4" aria-hidden />
                <span className="text-sm">
                  <span className="block font-medium">{tile.label}</span>
                  <span className="text-muted-foreground block text-xs">
                    {allClear ? 'All clear' : tile.blurb}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    allClear
                      ? 'text-muted-foreground text-lg font-semibold tabular-nums'
                      : 'text-lg font-semibold tabular-nums'
                  }
                >
                  {tile.count}
                </span>
                <ArrowRight
                  className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default NeedsAttention;
```

- [ ] **Step 5: Page composition** — in `app/(admin)/page.tsx`, add the imports and insert the widget row between the chart div and the DataTable div (inside the `stats ? (…)` branch, after the chart's closing `</div>`):

```tsx
          <div className="grid gap-4 px-4 md:grid-cols-2 xl:grid-cols-3 lg:px-6">
            <BookingsPipeline byStatus={stats.bookingsByStatus} />
            <TopToursCard
              byRevenue={stats.topToursByRevenue}
              byRating={stats.topToursByRating}
              byWishlist={stats.topToursByWishlist}
            />
            {stats.pendingCounts ? <NeedsAttention counts={stats.pendingCounts} /> : null}
          </div>
```

```ts
import { BookingsPipeline } from '../../components/dashboard/bookings-pipeline';
import { NeedsAttention } from '../../components/dashboard/needs-attention';
import { TopToursCard } from '../../components/dashboard/top-tours-card';
```

- [ ] **Step 6:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin && pnpm nx lint @tourism/admin` — all PASS (lint: 0 errors, warnings pre-existing only).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/components/dashboard apps/admin/src/app/\(admin\)/page.tsx
git commit -m "feat(admin): dashboard chart metric toggle + pipeline, top-tours, queue widgets"
```

### Task 5: Slice-2 gate + merge + wrap-up

- [ ] **Step 1:** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green.
- [ ] **Step 2:** Self-certify (widget composition on reviewed card patterns; pipeline transform is TDD'd).
- [ ] **Step 3:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-dashboard-wins-fe && git push origin main && git branch -d feat/admin-dashboard-wins-fe`.
- [ ] **Step 4:** Wrap-up: STATUS line on this plan, tick Wave 4 in the roadmap, update memory, tell the user what to check (chart Bookings toggle · pipeline shares · Top tours tabs + links · Needs-attention tiles → queues; pendingCounts appears only after Render redeploys).
