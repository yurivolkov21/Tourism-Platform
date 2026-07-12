# Admin wave D2 — TabPills · dashboard range + multi-currency · last-admin race — design spec

**Date:** 2026-07-12 · **Scope:** apps/admin + apps/api (no schema migration) ·
**Status:** approved scope (user 2026-07-11: D2 = TabPills extraction · dashboard
custom date-range + Top Tours multi-currency · last-admin-demote race; cuts stay:
notifications · category imagery · admin e2e). Design choices approved
2026-07-12: multi-currency = **group by currency, no FX**; date-range =
**presets + custom Calendar range, URL-driven**.

## ① Shared `TabPills` (admin refactor, no behavior change)

Inventory (2026-07-12): **13 copy-pasted tablists in 12 files** with
byte-identical class strings — bookings-filters, reviews-view, enquiries-view,
users-filters, tours/destinations/categories/posts tables, departures-table
(×2: time + status), media page + outbox page (`<Link>` variant). The
`@tourism/ui` `Tabs` primitive is a panel-switcher (different styling, no count
badge, can't render `<Link>`) — deliberately not reused.

- New `apps/admin/src/components/crud/tab-pills.tsx`:

  ```ts
  interface TabPillItem<T extends string = string> {
    value: T;
    label: string;
    count?: number; // badge only when defined (bookings' optional counts)
  }
  interface TabPillsProps<T extends string> {
    tabs: TabPillItem<T>[];
    value: T;
    ariaLabel?: string;
    onValueChange?: (v: T) => void; // <button> variant
    hrefFor?: (v: T) => string;     // <Link> variant (RSC-safe: no 'use client')
  }
  ```

- Byte-compatible classes: container
  `bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1`
  (`role="tablist"`), pill
  `inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors`
  (Link variant drops `cursor-pointer`), active
  `bg-background text-foreground shadow-sm`, inactive `hover:text-foreground`,
  badge `<Badge variant="secondary" className="px-1.5 tabular-nums">`.
  `role="tab"` + `aria-selected` on every pill (a11y upgrade for the pages
  missing it). `gap-1.5` kept unconditionally (inert without a badge).
- Migrate all 13 tablists. **Not migrated:** post-form's Write|Preview switcher
  (semantically a content toggle, `capitalize` divergence — stays hand-rolled).
- The dashboard date-range presets (③) also render through `TabPills`.

## ② Dashboard: date range + per-currency (api + admin)

### BE — `GET /admin/stats/dashboard?from&to`

- New `DashboardStatsQueryDto`: `from?`/`to?` — `YYYY-MM-DD` strings
  (`@Matches` date regex + real-date check). Interpreted as **UTC day bounds**:
  `createdAt >= from 00:00Z` and `createdAt < to+1d 00:00Z`. Both optional and
  independent; `from > to` → 400 `STATS_RANGE_INVALID`. **No params = today's
  exact output** (all-time overview, 90d daily) — backwards compatible.
- Range applies to: `bookingsByStatus` · overview aggregates · conversion ·
  `topToursByRevenue` (booking.createdAt) · `topToursByRating`
  (review.createdAt) · `topToursByWishlist` (wishlist.createdAt) · `dailyTrend`
  (range clamped to its **most recent 90 days** — keeps payload + chart cap).
  **Unaffected:** `monthlyTrend` + `monthOverMonthGrowth` (fixed 5 months, as
  approved) and `pendingCounts` (current-state).
- Trend SQL becomes `Prisma.sql` with interpolated bound params (stays
  injection-safe — Prisma parameterizes).

### BE — per-currency aggregation (no FX)

- **Dominant currency** = most PAID bookings in range (count-based — raw
  cross-currency amount comparison is meaningless); ties: higher total, then
  currency A→Z. Empty range → `USD`.
- `overview` keeps `totalRevenue`/`currency` (= dominant currency's sum —
  USD-only data renders byte-identically) and gains
  `revenueByCurrency: Array<{ currency, total: string, paidBookings }>`
  (sorted: dominant first).
- `topToursByRevenue`: groupBy `['tourId','currency']`, rows gain `currency`;
  JS sort — dominant-currency rows by amount desc, then other currencies —
  slice 5. (No DB `take`: bounded by tours × currencies, fine at this scale.)
- `monthlyTrend`/`dailyTrend`: SQL groups by bucket + currency; JS reduces —
  `bookings` counts ALL currencies, `revenue` = dominant currency only (the
  charts are single-currency; series currency = `overview.currency`). MoM
  derives from that series.
- Envelope note: single-object endpoint → new fields live **inside `data`**
  (extend `AdminStatsResponseDto`), never top-level.

### FE — admin dashboard

- `lib/dashboard/date-range.ts` (TDD, pure): `parseDateParam` (strict
  `YYYY-MM-DD` + real calendar date, else undefined) · `presetRange(preset,
  today)` → `{from,to}` for 7d/30d/90d/This month · `matchPreset(from, to,
  today)` (URL → active pill; anything else = Custom).
- `components/dashboard/date-range-control.tsx` (`'use client'`): preset
  `TabPills` (7 days · 30 days · 90 days · This month · All time) + a
  **Custom** `Popover` + `Calendar mode="range"` (from `@tourism/ui`) with an
  Apply button → `router.push` with `?from&to` (bookings-filters URL pattern).
  Presets compute dates **in the browser** (date-only strings — the wave-C TZ
  rule satisfied; no datetime-local anywhere).
- `page.tsx` parses `searchParams` via `parseDateParam`, passes to
  `getDashboardStats(from, to)` (query-string append; invalid params dropped).
- `top-tours-card`: revenue rows use per-row `formatMoney(t.revenue,
  t.currency)` (fallback to overview currency for lagging API).
- KPI revenue card: unchanged for one currency; when `revenueByCurrency` has
  extras, the card footnote lists them (`+ 1.200.000 ₫` via `formatMoney`).
- `lib/dashboard/stats.ts` types + defensive defaults extended (missing new
  fields tolerated).

## ③ Last-admin demote race (api)

Current guard (`admin-users.service.ts:178-193`) is `count()` → `update()` —
two concurrent demotes of two different admins both pass the count and leave
**zero admins**. Repo convention forbids **interactive** transactions that
hold locks across statements (Supabase pooler); a **single-statement
locking-CTE claim** is still pooler-safe (one autocommit statement — locks
live only for its duration). Note this is NOT the same shape as payments'
seat-claim (which guards a single row via a conditional data-modifying CTE,
no `FOR UPDATE`): the last-admin invariant is an **aggregate** ("≥1 other
admin remains"), so the admin rows must be locked for the count to be
race-free:

```sql
WITH admins AS (
  SELECT id FROM users WHERE role = 'ADMIN'::"UserRole" ORDER BY id FOR UPDATE
)
UPDATE users
SET role = 'CUSTOMER'::"UserRole", updated_at = NOW()
WHERE id = $1::uuid
  AND role = 'ADMIN'::"UserRole"
  AND (SELECT COUNT(*) FROM admins) > 1
RETURNING id
```

- `FOR UPDATE` locks every admin row for the statement; a concurrent demote
  blocks, re-reads committed versions (READ COMMITTED re-check), sees the
  demoted row drop out of `admins`, count = 1 → 0 rows → 409. `ORDER BY id`
  makes lock order deterministic (no deadlock). Single statement = pooler-safe.
- Service flow: keep the existing UX pre-checks (`findOrThrow`, self-change
  409, env-admin 409) — the CTE is the **authoritative** gate. Demote branch
  runs the claim; empty `RETURNING` → 409 `ROLE_LAST_ADMIN` (unchanged code +
  message). Success → re-fetch the row for the DTO. Promote/same-role updates
  stay `prisma.user.update`.
- **`deleteUser` closes the same invariant** (adversarial review 2026-07-12):
  the in-tx row delete becomes a role-conditional
  `deleteMany({ id, role: CUSTOMER })` — a target promoted between the
  pre-check and the tx can no longer be deleted (409 `USER_IS_ADMIN`),
  killing the promote→demote→delete interleaving that could zero out admins.
- No schema change, no FE change (`danger-zone.tsx` already renders the 409).

### Accepted residuals (adversarial review 2026-07-12)

- **Race-window error labels**: an empty demote claim conflates "last admin"
  with "target concurrently demoted/deleted" (409 `ROLE_LAST_ADMIN` either
  way), and the post-claim re-fetch can echo a concurrently re-promoted role.
  Window-only, cosmetic — the invariant itself always holds.
- **Trend currency under a range on multi-currency data**: the dominant
  currency is range-derived, so the fixed 5-month `monthlyTrend`/MoM series
  re-denominates when a range flips the dominant currency (single-currency
  data unaffected). Documented, not fixed — deriving a second dominant for
  the trend window costs an extra aggregate for a state the platform doesn't
  have yet.
- **`Number()`-based ordering of Decimal strings** in the currency/top-tour
  sorts: mis-ordering needs >15 significant digits — display-only, accepted.
- **KPI card copy** ("All bookings to date") stays static under a range; the
  MoM deltas remain fixed-window by design next to range-scoped numbers.

## Error handling

- Stats: `STATS_RANGE_INVALID` 400 (from > to); malformed dates rejected by DTO
  validation (400). FE drops unparsable URL params (control shows All time).
- TabPills: pure refactor — no new error surface.
- Demote: empty claim → 409 `ROLE_LAST_ADMIN`; concurrent role flip between
  pre-check and claim also lands there (conservative, correct).

## Testing (TDD on logic)

- api: `admin-stats.service.spec.ts` — range where-clause propagation ·
  UTC bound math · dominant-currency selection (count-based + tie-breaks) ·
  `revenueByCurrency` shape · mixed-currency top-tours sort/slice · trend
  reduce (bookings all-currency, revenue dominant-only) · `STATS_RANGE_INVALID`.
  `admin-users.service.spec.ts` — demote uses `$queryRaw` claim; `[]` → 409
  `ROLE_LAST_ADMIN`; success path re-fetch; promote untouched.
- admin: `tab-pills.spec.tsx` (button/Link variants, aria-selected, badge
  only when count defined, callback) · `date-range.spec.ts` (parse/preset/
  match, month edges, invalid dates) · existing view specs stay green.
- `/regen-types` after DTO change; full gate; **adversarial review before
  merge** (locking-CTE semantics + aggregation correctness are the risk).

## Definition of done

One shared `TabPills` renders all 13 list tablists byte-identically; dashboard
deep-links `?from&to`, presets + custom range work, no-param output unchanged;
a mixed-currency dataset shows per-currency revenue without cross-currency
sums anywhere; two concurrent demotes can never zero out admins (spec-proven
claim semantics); gate green; docs swept.
