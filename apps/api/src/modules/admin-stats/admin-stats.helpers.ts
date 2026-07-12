import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * DAY_MS;

/** Inclusive/exclusive `createdAt` bounds resolved from `?from&to`. */
export interface RangeBounds {
  gte?: Date;
  lt?: Date;
}

/**
 * Parses a `YYYY-MM-DD` string as a UTC day start and rejects calendar-invalid
 * dates (e.g. `2026-02-30`) that JS's `Date` constructor silently rolls
 * forward instead of rejecting.
 */
function parseUtcDayStart(dateStr: string): Date {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateStr
  ) {
    throw new BadRequestException({
      code: 'STATS_RANGE_INVALID',
      message: `Invalid date: "${dateStr}"`,
    });
  }
  return date;
}

/**
 * Resolves `?from&to` (both optional, independent `YYYY-MM-DD` strings) into
 * UTC day bounds: `gte` = `from` 00:00Z, `lt` = the day *after* `to` at
 * 00:00Z (exclusive). No args → `{}` (unbounded — callers must treat this as
 * "omit the createdAt clause entirely" to stay byte-identical to today's
 * output). Throws 400 `STATS_RANGE_INVALID` on a malformed/non-existent date
 * or `from > to`.
 */
export function resolveRangeBounds(from?: string, to?: string): RangeBounds {
  if (from && to && from > to) {
    throw new BadRequestException({
      code: 'STATS_RANGE_INVALID',
      message: `"from" (${from}) must not be after "to" (${to})`,
    });
  }
  const bounds: RangeBounds = {};
  if (from) {
    bounds.gte = parseUtcDayStart(from);
  }
  if (to) {
    const toStart = parseUtcDayStart(to);
    bounds.lt = new Date(toStart.getTime() + DAY_MS);
  }
  return bounds;
}

/**
 * Wraps resolved bounds under `createdAt` for a Prisma `where` clause.
 * Empty bounds → `{}` (no key at all — spreading this into an existing
 * `where` is a no-op, keeping the unbounded/no-arg query byte-identical).
 */
export function rangeWhere(bounds: RangeBounds): {
  createdAt?: { gte?: Date; lt?: Date };
} {
  if (bounds.gte === undefined && bounds.lt === undefined) {
    return {};
  }
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (bounds.gte !== undefined) createdAt.gte = bounds.gte;
  if (bounds.lt !== undefined) createdAt.lt = bounds.lt;
  return { createdAt };
}

/**
 * The `dailyTrend` window is the resolved range clamped to its most recent
 * 90 days (payload/chart cap). No bounds → `now - 90d` .. open-ended, same
 * as today. Only `from` → clamped against `now`. Only/both bounds → clamped
 * against the exclusive `to` bound (or `now` if `to` is unset).
 */
export function clampDailyWindow(
  bounds: RangeBounds,
  now: Date,
): { gte: Date; lt?: Date } {
  // A deep-linked future `to` must not drag the 90d back-off past `now` —
  // that would blank the chart while the rest of the dashboard shows data.
  const effectiveLt =
    bounds.lt !== undefined && bounds.lt.getTime() < now.getTime()
      ? bounds.lt
      : now;
  const ninetyDaysBeforeLt = new Date(effectiveLt.getTime() - NINETY_DAYS_MS);
  const candidateStart = bounds.gte ?? ninetyDaysBeforeLt;
  const gte =
    candidateStart.getTime() > ninetyDaysBeforeLt.getTime()
      ? candidateStart
      : ninetyDaysBeforeLt;
  return { gte, lt: bounds.lt };
}

/** A single currency's PAID-booking aggregate in range. */
export interface CurrencyGroupRow {
  currency: string;
  paidBookings: number;
  /** Decimal.toString() — kept as a string for exact output; sorted via Number(). */
  total: string;
}

/**
 * Orders currency groups dominant-first: most PAID bookings, ties broken by
 * higher total, then currency A→Z. Empty input has no defined order (callers
 * fall back to 'USD' via `pickDominantCurrency`).
 */
export function sortCurrencyGroups(
  rows: CurrencyGroupRow[],
): CurrencyGroupRow[] {
  return [...rows].sort((a, b) => {
    if (b.paidBookings !== a.paidBookings)
      return b.paidBookings - a.paidBookings;
    const totalDiff = Number(b.total) - Number(a.total);
    if (totalDiff !== 0) return totalDiff;
    return a.currency.localeCompare(b.currency);
  });
}

/** Dominant currency = most PAID bookings in range (see `sortCurrencyGroups`); 'USD' when there is no data. */
export function pickDominantCurrency(rows: CurrencyGroupRow[]): string {
  if (rows.length === 0) return 'USD';
  return sortCurrencyGroups(rows)[0].currency;
}

/** One `topToursByRevenue` row, pre-sort (per tourId × currency). */
export interface TopRevenueRow {
  tourId: string;
  slug: string;
  title: string;
  revenue: string;
  bookingsCount: number;
  currency: string;
}

/**
 * Ranks dominant-currency rows by revenue desc first, then the remaining
 * rows grouped by currency (A→Z) with revenue desc within each group —
 * never sums across currencies. Slices to the top 5.
 */
export function sortTopRevenueRows(
  rows: TopRevenueRow[],
  dominant: string,
): TopRevenueRow[] {
  const byRevenueDesc = (a: TopRevenueRow, b: TopRevenueRow) =>
    Number(b.revenue) - Number(a.revenue);

  const dominantRows = rows
    .filter((r) => r.currency === dominant)
    .sort(byRevenueDesc);
  const otherRows = rows
    .filter((r) => r.currency !== dominant)
    .sort((a, b) => {
      if (a.currency !== b.currency)
        return a.currency.localeCompare(b.currency);
      return byRevenueDesc(a, b);
    });

  return [...dominantRows, ...otherRows].slice(0, 5);
}

/** Raw monthly-trend row (per month bucket × currency). */
export interface MonthlyTrendRow {
  month: Date;
  bookings: bigint;
  paid: bigint;
  revenue: Prisma.Decimal | null;
  currency: string;
}

export interface MonthlyTrendPoint {
  month: string;
  bookings: number;
  paidBookings: number;
  revenue: string;
}

/**
 * Collapses per-currency monthly rows into one point per month: `bookings`/
 * `paidBookings` sum ALL currencies, `revenue` is the dominant currency's
 * sum only (defaults to "0" when the dominant currency has no row for that
 * bucket). Ascending by month.
 */
export function reduceMonthlyRows(
  rows: MonthlyTrendRow[],
  dominant: string,
): MonthlyTrendPoint[] {
  const buckets = new Map<
    string,
    { bookings: number; paid: number; revenue: string }
  >();
  for (const row of rows) {
    const key = row.month.toISOString().slice(0, 7);
    const bucket = buckets.get(key) ?? { bookings: 0, paid: 0, revenue: '0' };
    bucket.bookings += Number(row.bookings);
    bucket.paid += Number(row.paid);
    if (row.currency === dominant) {
      bucket.revenue = (row.revenue ?? new Prisma.Decimal(0)).toString();
    }
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      bookings: b.bookings,
      paidBookings: b.paid,
      revenue: b.revenue,
    }));
}

/** Raw daily-trend row (per day bucket × currency). */
export interface DailyTrendRow {
  day: Date;
  bookings: bigint;
  revenue: Prisma.Decimal | null;
  currency: string;
}

export interface DailyTrendPoint {
  date: string;
  bookings: number;
  revenue: string;
}

/**
 * Collapses per-currency daily rows into one point per day: `bookings` sums
 * ALL currencies, `revenue` is the dominant currency's sum only. Ascending
 * by date.
 */
export function reduceDailyRows(
  rows: DailyTrendRow[],
  dominant: string,
): DailyTrendPoint[] {
  const buckets = new Map<string, { bookings: number; revenue: string }>();
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { bookings: 0, revenue: '0' };
    bucket.bookings += Number(row.bookings);
    if (row.currency === dominant) {
      bucket.revenue = (row.revenue ?? new Prisma.Decimal(0)).toString();
    }
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      bookings: b.bookings,
      revenue: b.revenue,
    }));
}
