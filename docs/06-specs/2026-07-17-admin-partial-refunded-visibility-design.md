# Admin: PARTIALLY_REFUNDED as a first-class dashboard status — design spec

**Date:** 2026-07-17 · **Scope:** `@tourism/admin` only (API verified correct) · **Status:** APPROVED (design signed off 2026-07-17)

## Problem (investigated — confirmed)

The bookings tab row shows All = 38 while the status tabs sum to 37 (Paid 26 +
Pending 0 + Cancelled 7 + Refunded 4): one real PARTIALLY_REFUNDED booking
(money-path partial refund) is counted by the API but never rendered by the
admin UI.

- **API is correct** — `admin-stats.service.ts` seeds all 5 statuses in
  `bookingsByStatus` (totalBookings = 38); `bookings.service.ts#countByStatus`
  groups all 5; the list filter matches `status` exactly.
- **Bug 1** — `bookings-filters.tsx` `TABS` lists only
  all/PENDING/PAID/CANCELLED/REFUNDED, while the "All" badge sums EVERY key of
  `statusCounts` (incl. partial) → 38 vs 37.
- **Bug 2** — `transforms.ts` `PIPELINE_ORDER`/`PIPELINE_LABEL` carry only 4
  statuses; `bookingsPipeline` totals only those → the "Bookings pipeline"
  widget is missing the partial bar and disagrees with the "Bookings" KPI.

### Audit findings (this brief's mandated sweep — all fixed here too)

| # | Site | Issue |
| --- | --- | --- |
| A | `app/(admin)/bookings/page.tsx` `STATUSES` | validates `?status=` — without partial the new tab's URL param parses to `undefined` (silently shows "all"); blocker for the tab itself |
| B | `components/dashboard/data-table.tsx` | recent-bookings widget: `STATUS_VARIANT` + its own mini status tabs omit partial → `Badge variant={undefined}`, label renders `partially_refunded`, widget tab counts repeat the 38-vs-37 class of bug |
| C | `lib/dashboard/stats.ts` | `bookingsByStatus` typed as a 4-key Record while the API returns 5 — the type lie that let transforms consume only 4 |
| D | `components/dashboard/bookings-pipeline.tsx` `DOT_CLASS` | `Record<PipelineStatus, string>` — extending `PIPELINE_ORDER` forces a new dot entry (typecheck-enforced) |

**Audited clean (no status enumeration → cannot omit):** Top tours
(revenue/rating/wishlist) and Needs-attention (`pendingCounts`) come straight
from API aggregates; KPI "Bookings" = `overview.totalBookings`; the booking
detail page handles partial explicitly; `canRefund` stays PAID-only (tested);
`lib/bookings/format.ts` `STATUS_META` already covers partial (label +
`destructive` variant, tested); `ListAdminBookingsQueryDto.status` is
`@IsEnum(BookingStatus)` — the server-side filter already accepts
PARTIALLY_REFUNDED (no API change).

## Locked decisions

1. **Tab**: add `{ value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' }`
   to `TABS` **after Refunded**; badge reads `statusCounts` like every other
   tab. After this, Σ(status tabs) = "All" badge.
2. **Pipeline**: add `PARTIALLY_REFUNDED` to `PIPELINE_ORDER` +
   `PIPELINE_LABEL` ('Partially refunded'), **after REFUNDED**;
   `bookingsPipeline`'s total then includes it (it reduces over
   `PIPELINE_ORDER`) → Σ(pipeline) = `totalBookings`.
3. **URL parse**: add partial to `bookings/page.tsx` `STATUSES` so
   `?status=PARTIALLY_REFUNDED` survives `parseStatus` and filters
   server-side.
4. **Stats type**: `stats.ts` `bookingsByStatus` becomes the 5-key Record
   (matches the API payload).
5. **Recent-bookings widget** (`data-table.tsx`): extend `BookingRowStatus`
   (in `lib/dashboard/bookings-table.ts`) to the 5-status union; add
   `STATUS_VARIANT.PARTIALLY_REFUNDED: 'destructive'` (mirrors
   `STATUS_META`); add the status to the widget's mini tabs (after REFUNDED);
   fix the label cell from `status.toLowerCase()` to
   `status.replace(/_/g, ' ').toLowerCase()` so partial renders
   "partially refunded" (the existing `capitalize` class title-cases it) —
   existing labels unchanged.
6. **Pipeline dot**: add a `DOT_CLASS` entry for partial. The file already
   uses Tailwind palette classes (`bg-amber-500` …) — the new entry follows
   the same idiom (`bg-violet-500`), not a new color system. (Pre-existing
   idiom; migrating this file to tokens is out of scope.)
7. Labels live where their siblings live (these component files carry their
   own strings today — admin is not i18n-routed; consistent with the
   existing tabs).

## Consistency equations (acceptance)

`Σ status-tab badges = "All" badge = KPI totalBookings = Σ pipeline bars` —
all four read the same 5-status sources (`statusCounts` /
`bookingsByStatus`), so with the enumerations completed they agree by
construction.

## Testing (TDD on logic)

- `transforms.spec.ts` (extend): `PIPELINE_ORDER` contains partial after
  REFUNDED; `bookingsPipeline` renders 5 rows, includes the partial count in
  the total (pct denominators), label mapping.
- `format.spec.ts`: already covers partial meta — unchanged.
- Component behaviour (tab render/filter wiring) is URL/state plumbing over
  the shared `TabPills`; covered by typecheck + the existing conventions
  (visual check on deploy per repo rule).

## Planned files

| File | Change |
| --- | --- |
| `apps/admin/src/lib/dashboard/transforms.ts` (+ spec) | pipeline order/label + tests |
| `apps/admin/src/components/bookings/bookings-filters.tsx` | new tab |
| `apps/admin/src/app/(admin)/bookings/page.tsx` | `STATUSES` += partial |
| `apps/admin/src/lib/dashboard/stats.ts` | 5-key `bookingsByStatus` type |
| `apps/admin/src/lib/dashboard/bookings-table.ts` | `BookingRowStatus` full union |
| `apps/admin/src/components/dashboard/data-table.tsx` | variant + mini tab + label fix |
| `apps/admin/src/components/dashboard/bookings-pipeline.tsx` | dot entry |
| `docs/CHANGELOG.md` | docs sweep on merge (rule 9; no DTO/endpoint change) |

## Verify (on deploy)

With today's data: All = 38, Σ tabs = 38, Σ pipeline = 38, KPI = 38. The
"Partially refunded" tab lists exactly the 1 partial booking ("Showing 1 of
1" matches its badge); "Refunded" lists exactly the 4 fully-refunded ones. A
new partial refund moves every number in lockstep.
