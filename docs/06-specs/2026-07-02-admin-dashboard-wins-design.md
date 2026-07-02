# Admin Dashboard quick wins (Wave 4) — design

- **Date:** 2026-07-02
- **Scope:** `@tourism/admin` dashboard + one tiny additive `@tourism/api` stats field. Wave 4 of
  the enrichment roadmap (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`).
- **Status:** approved direction, spec for execution
- **Trigger (audit findings):** the stats endpoint computes and returns data the UI discards —
  `topToursByRevenue`, `topToursByRating`, `topToursByWishlist` (no widget renders any of them),
  `bookingsByStatus` (fetched, never visualized), `dailyTrend.bookings` (only revenue is plotted).
  The dashboard also lacks operational-queue signals (pending reviews / new enquiries).

## Decisions (user-approved)

- **Include the small BE addition:** `pendingCounts: { reviews: number; enquiries: number }` on
  `AdminStatsResponseDto` — powers the "Needs attention" tiles (the only Wave-4 item the payload
  can't serve today).
- **Chart = metric toggle, not stacking:** the existing in-code rationale stands (bookings are
  single digits vs revenue in hundreds — stacked they flatten). A Revenue | Bookings toggle shows
  one series at a time, reusing the discarded `dailyTrend.bookings`.
- **Top tours = ONE card with internal tabs** (Revenue | Rating | Wishlisted), not three cards.
- KPI `SectionCards` and the recent-bookings `DataTable` stay as-is.

## Slice 1 — BE: `pendingCounts`

- `AdminStatsResponseDto` += nested `PendingCountsDto { reviews: number; enquiries: number }`.
- `admin-stats.service.ts`: two extra counts in the existing `Promise.all` —
  `prisma.review.count({ where: { isApproved: false } })` and
  `prisma.enquiry.count({ where: { status: EnquiryStatus.NEW } })` — mapped into the response.
- +1 service spec (counts wired through). Regen `@tourism/core` types.
- `ecc:code-reviewer` (small, but stats is a wide admin surface — cheap check).

## Slice 2 — Admin FE

1. **`lib/dashboard/stats.ts`** — the local `DashboardStats` interface gains the fields it already
   receives but doesn't type: `topToursByRating[]`, `topToursByWishlist[]` (shapes per the DTO) and
   the new `pendingCounts`. Deploy-lag guards in `getDashboardStats` (mirror the existing
   `dailyTrend ?? []`): `topToursByRating ?? []`, `topToursByWishlist ?? []`,
   `pendingCounts ?? null` (tiles hidden when null).
2. **Chart metric toggle** (`chart-area-interactive.tsx`): a second small `ToggleGroup`
   (Revenue | Bookings) in the header; `chartConfig` gains a `bookings` entry
   (`var(--chart-2)`-class token color); the Area/dataKey/gradient/title/description switch with
   the selected metric; the range toggle and 0-clamped Y domain stay.
3. **New card row** under the chart (`grid gap-4 md:grid-cols-2 xl:grid-cols-3` inside the
   existing `px-4 lg:px-6` rhythm):
   - **`BookingsPipeline` card** — one row per status in fixed order PENDING → PAID → CANCELLED →
     REFUNDED: status dot (the list-page badge colors), label, count, and a thin percent bar
     (share of total). Pure helper `bookingsPipeline(byStatus)` in `lib/dashboard/transforms.ts`
     (TDD): returns ordered `{ status, label, count, pct }[]`, zero-safe.
   - **`TopToursCard`** — internal tab strip (Revenue | Rating | Wishlisted, the segmented-tab
     look) over a 5-row list: tour title linked to `/tours/[slug]`, right-aligned metric —
     Revenue: `$4,500 · 30 bookings` · Rating: `★ 4.8 · 24 reviews` · Wishlisted: `42 saves`.
     Empty tab state: "No data yet."
   - **`NeedsAttention` card** — two stat tiles: **Pending reviews** (count → link `/reviews`) and
     **New enquiries** (count → link `/enquiries?status=NEW`); zero counts render with muted
     "All clear" styling; whole card hidden when `pendingCounts` is null (old API).
4. Page (`app/(admin)/page.tsx`) composes the new row between the chart and the DataTable.

## Out of scope

- No changes to SectionCards / DataTable / monthlyTrend usage · no new BE aggregations beyond
  `pendingCounts` · no drill-down pages · other waves.

## Testing

- BE: +1 service spec. FE: `bookingsPipeline` TDD in `transforms.spec.ts` (existing transforms
  spec file); widgets are static composition on reviewed card patterns — task-review + build gate.
- Gate per slice; slice 1 → `ecc:code-reviewer`; slice 2 self-certified unless findings. Merging
  after green slices is pre-authorized.

## Risks

- **Deploy-lag:** all three new widgets must tolerate the old API payload (missing fields) — the
  `?? []` / `?? null` guards in `getDashboardStats` are the single choke point.
- **Chart config tokens:** use chart token colors (`var(--primary)` / chart palette vars) — no hex.
- `/enquiries?status=NEW` deep link relies on the existing URL-driven status tabs (works today).

## Success criteria

- Every field the stats endpoint returns is rendered somewhere (nothing computed-and-discarded).
- Chart toggles Revenue ↔ Bookings; pipeline card shows the 4 status shares; Top tours card tabs
  across the 3 rankings with working links; Needs-attention tiles link to the queues.
- Gate green per slice.
