# ADR-0010 — Dashboard stats aggregate per currency; no FX conversion

**Status:** Accepted · **Date:** 2026-07-12 (retroactive record — decision
shipped earlier; see date in Context)

## Context

`Booking.totalAmount` is stored alongside a per-booking `currency`
(`VarChar(3)`). Before wave D2, the admin dashboard summed raw amounts across
currencies — latent because the seed data is USD-only, but wrong the moment a
second currency appears (a EUR total added straight into a USD total is not a
number). Converting correctly needs a live FX rate source plus a refresh job —
disproportionate infrastructure for an admin dashboard.

## Decision

Wave D2 (2026-07-12): group every revenue aggregate by currency instead of
summing across them, in
`apps/api/src/modules/admin-stats/admin-stats.helpers.ts` +
`admin-stats.service.ts`:

- **Dominant currency** = the currency with the most PAID bookings in range
  (count-based, **not** amount comparison across currencies) — ties broken by
  higher total, then currency A→Z (`sortCurrencyGroups`/
  `pickDominantCurrency`, helpers.ts ~L109–129).
- `overview.totalRevenue`/`currency` report the dominant currency only;
  `overview.revenueByCurrency[]` carries every currency's own total
  (service.ts ~L196–207).
- `topToursByRevenue` groups by `(tour, currency)`, dominant-currency rows
  ranked first, others grouped by currency A→Z (`sortTopRevenueRows`,
  helpers.ts ~L146–165).
- Daily/monthly trend series report the dominant currency's revenue only;
  `bookings`/`paidBookings` counts still sum all currencies
  (`reduceDailyRows`/`reduceMonthlyRows`, helpers.ts ~L189–257). MoM growth is
  derived from that same single-currency series.
- Accepted residual: a date range whose dominant currency differs from the
  unfiltered range's re-denominates the (otherwise fixed) monthly trend —
  documented in the wave D2 spec.

## Consequences

- Correct by construction with mixed currencies — no silent cross-currency
  addition.
- Zero external dependencies (no FX rate provider, no refresh job).
- A cross-currency "grand total" intentionally does not exist; the UI must
  read `revenueByCurrency[]` if it wants every currency's figure.

See `apps/api/src/modules/admin-stats/admin-stats.helpers.ts` +
`admin-stats.service.ts` and the wave D2 spec
(`docs/06-specs/2026-07-12-admin-wave-d2-design.md`).
