const RANGE_DAYS = { '90d': 90, '30d': 30, '7d': 7 } as const;

export type DailyRange = keyof typeof RANGE_DAYS;

/** Last N entries of the daily series (the series is already ascending by date). */
export function sliceDailyTrend<T>(daily: T[], range: DailyRange): T[] {
  return daily.slice(-RANGE_DAYS[range]);
}

export interface CardModel {
  key: 'revenue' | 'bookings' | 'conversion' | 'aov';
  label: string;
  value: string;
  /** Fractional change (0.25 = +25%) when a real historical delta exists, else null. */
  delta: number | null;
}

interface Overview {
  totalRevenue: string;
  currency: string;
  totalBookings: number;
  paidBookings: number;
  conversionRate: number;
  monthOverMonthGrowth: number | null;
}

export function formatMoney(value: string | number, currency: string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** The four KPI cards, with deltas only where a real historical comparison exists. */
export function computeCardModels(
  overview: Overview,
  monthly: { month: string; bookings: number; revenue: string }[],
): CardModel[] {
  const bookingsDelta =
    monthly.length >= 2 && monthly[monthly.length - 2].bookings > 0
      ? monthly[monthly.length - 1].bookings / monthly[monthly.length - 2].bookings - 1
      : null;

  const aov = overview.paidBookings > 0 ? Number(overview.totalRevenue) / overview.paidBookings : 0;

  return [
    {
      key: 'revenue',
      label: 'Total revenue',
      value: formatMoney(overview.totalRevenue, overview.currency),
      delta: overview.monthOverMonthGrowth,
    },
    {
      key: 'bookings',
      label: 'Bookings',
      value: String(overview.totalBookings),
      delta: bookingsDelta,
    },
    {
      key: 'conversion',
      label: 'Conversion rate',
      value: formatPct(overview.conversionRate),
      delta: null,
    },
    {
      key: 'aov',
      label: 'Avg order value',
      value: formatMoney(aov, overview.currency),
      delta: null,
    },
  ];
}
