const RANGE_DAYS = { '90d': 90, '30d': 30, '7d': 7 } as const;

export type DailyRange = keyof typeof RANGE_DAYS;

/** Last N entries of the daily series (the series is already ascending by date). */
export function sliceDailyTrend<T>(daily: T[], range: DailyRange): T[] {
  return daily.slice(-RANGE_DAYS[range]);
}

/** Numeric drive for the KPI count-up: NumberTicker(value, prefix, suffix, decimals). */
export interface TickerModel {
  value: number;
  prefix: string;
  suffix: string;
  decimals: number;
}

export interface CardModel {
  key: 'revenue' | 'bookings' | 'conversion' | 'aov';
  label: string;
  value: string;
  /**
   * Count-up model whose final frame formats to exactly `value` (same locale rules),
   * so SSR shows the final number and the animation lands on it.
   */
  ticker: TickerModel;
  /** Fractional change (0.25 = +25%) vs the prior month when both exist, else null. */
  delta: number | null;
  /** Muted footer descriptor line. */
  descriptor: string;
}

/** Relative change last-vs-prev, or null when prev is non-positive / missing. */
function rel(last: number, prev: number): number | null {
  return prev > 0 ? last / prev - 1 : null;
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

/**
 * Symbol placement for a currency under the same en-US rules `formatMoney` uses, so
 * `prefix + toLocaleString(body) + suffix` reproduces the `formatMoney` string exactly.
 */
export function currencyAffixes(currency: string): {
  prefix: string;
  suffix: string;
} {
  const parts = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).formatToParts(0);
  const firstDigit = parts.findIndex((p) => p.type === 'integer');
  const lastNumeric = parts.reduce(
    (last, p, i) =>
      p.type === 'integer' || p.type === 'decimal' || p.type === 'fraction'
        ? i
        : last,
    -1,
  );
  return {
    prefix: parts
      .slice(0, firstDigit)
      .map((p) => p.value)
      .join(''),
    suffix: parts
      .slice(lastNumeric + 1)
      .map((p) => p.value)
      .join(''),
  };
}

/** Fraction digits the currency renders with (2 for USD, 0 for e.g. JPY). */
function currencyDecimals(currency: string): number {
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const PIPELINE_ORDER = [
  'PENDING',
  'PAID',
  'CANCELLED',
  'REFUNDED',
] as const;
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
export function bookingsPipeline(
  byStatus: Record<PipelineStatus, number>,
): PipelineRow[] {
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

/** The four KPI cards. Deltas are real month-over-month (last vs prior month) when both exist. */
export function computeCardModels(
  overview: Overview,
  monthly: {
    month: string;
    bookings: number;
    paidBookings: number;
    revenue: string;
  }[],
): CardModel[] {
  const last = monthly.length >= 2 ? monthly[monthly.length - 1] : null;
  const prev = monthly.length >= 2 ? monthly[monthly.length - 2] : null;

  const revenueDelta =
    last && prev ? rel(Number(last.revenue), Number(prev.revenue)) : null;
  const bookingsDelta = last && prev ? rel(last.bookings, prev.bookings) : null;
  const conversionDelta =
    last && prev && last.bookings > 0 && prev.bookings > 0
      ? rel(
          last.paidBookings / last.bookings,
          prev.paidBookings / prev.bookings,
        )
      : null;
  const aovDelta =
    last && prev && last.paidBookings > 0 && prev.paidBookings > 0
      ? rel(
          Number(last.revenue) / last.paidBookings,
          Number(prev.revenue) / prev.paidBookings,
        )
      : null;

  const aov =
    overview.paidBookings > 0
      ? Number(overview.totalRevenue) / overview.paidBookings
      : 0;

  const money = currencyAffixes(overview.currency);
  const moneyDecimals = currencyDecimals(overview.currency);
  const revenue = Number(overview.totalRevenue);

  return [
    {
      key: 'revenue',
      label: 'Total Revenue',
      value: formatMoney(overview.totalRevenue, overview.currency),
      ticker: {
        value: Number.isFinite(revenue) ? revenue : 0,
        ...money,
        decimals: moneyDecimals,
      },
      delta: revenueDelta,
      descriptor: 'Paid bookings revenue',
    },
    {
      key: 'bookings',
      label: 'Bookings',
      value: overview.totalBookings.toLocaleString('en-US'),
      ticker: {
        value: overview.totalBookings,
        prefix: '',
        suffix: '',
        decimals: 0,
      },
      delta: bookingsDelta,
      descriptor: 'All bookings to date',
    },
    {
      key: 'conversion',
      label: 'Conversion Rate',
      value: formatPct(overview.conversionRate),
      ticker: {
        value: Math.round(overview.conversionRate * 100),
        prefix: '',
        suffix: '%',
        decimals: 0,
      },
      delta: conversionDelta,
      descriptor: 'Paid ÷ total bookings',
    },
    {
      key: 'aov',
      label: 'Avg Order Value',
      value: formatMoney(aov, overview.currency),
      ticker: { value: aov, ...money, decimals: moneyDecimals },
      delta: aovDelta,
      descriptor: 'Revenue per paid booking',
    },
  ];
}
