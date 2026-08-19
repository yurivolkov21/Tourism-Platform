import {
  sliceDailyTrend,
  computeCardModels,
  currencyAffixes,
  formatMoney,
  formatPct,
  bookingsPipeline,
} from './transforms';

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

test('computeCardModels: real month-over-month deltas for all four cards', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: 0.25,
  };
  const monthly = [
    { month: '2026-05', bookings: 20, paidBookings: 10, revenue: '800' },
    { month: '2026-06', bookings: 30, paidBookings: 24, revenue: '1000' },
  ];
  const cards = computeCardModels(overview, monthly);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  expect(byKey.revenue.delta).toBeCloseTo(0.25); // 1000 / 800 - 1
  expect(byKey.bookings.delta).toBeCloseTo(0.5); // 30 / 20 - 1
  expect(byKey.conversion.delta).toBeCloseTo(0.6); // (24/30) / (10/20) - 1
  expect(byKey.aov.delta).toBeCloseTo(1000 / 24 / (800 / 10) - 1);
  expect(byKey.aov.value).toBe(formatMoney(25, 'USD')); // 1000 / 40
});

test('computeCardModels: no deltas with <2 months', () => {
  const overview = {
    totalRevenue: '0',
    currency: 'USD',
    totalBookings: 0,
    paidBookings: 0,
    conversionRate: 0,
    monthOverMonthGrowth: null,
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
  expect(byKey.revenue.delta).toBeNull();
  expect(byKey.bookings.delta).toBeNull();
  expect(byKey.conversion.delta).toBeNull();
  expect(byKey.aov.delta).toBeNull();
  expect(byKey.aov.value).toBe(formatMoney(0, 'USD'));
});

test('computeCardModels: revenue card gets an extraCurrencies footnote when the range mixes currencies', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: null,
    revenueByCurrency: [
      { currency: 'USD', total: '1000.00', paidBookings: 30 },
      { currency: 'VND', total: '1200000', paidBookings: 10 },
    ],
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  expect(byKey.revenue.extraCurrencies).toBe(
    `+ ${formatMoney('1200000', 'VND')}`,
  );
  // Only the revenue card carries the footnote.
  expect(byKey.bookings.extraCurrencies).toBeUndefined();
  expect(byKey.conversion.extraCurrencies).toBeUndefined();
  expect(byKey.aov.extraCurrencies).toBeUndefined();
});

test('computeCardModels: AOV divides dominant revenue by the dominant paid count, not the all-currency count', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 20, // 10 USD + 10 VND
    conversionRate: 0.4,
    monthOverMonthGrowth: null,
    revenueByCurrency: [
      { currency: 'USD', total: '1000.00', paidBookings: 10 },
      { currency: 'VND', total: '1200000', paidBookings: 10 },
    ],
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
  // $1000 across 10 USD-paid bookings = $100 — dividing by all 20 would show $50.
  expect(byKey.aov.value).toBe(formatMoney(100, 'USD'));
  expect(byKey.aov.ticker.value).toBe(100);
});

test('computeCardModels: no extraCurrencies footnote for a single-currency range', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: null,
    revenueByCurrency: [
      { currency: 'USD', total: '1000.00', paidBookings: 40 },
    ],
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
  expect(byKey.revenue.extraCurrencies).toBeUndefined();
});

test('computeCardModels: revenue card gets a "Margin {amount}" line per currency plus the upper-bound footnote', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: null,
    revenueByCurrency: [
      {
        currency: 'USD',
        total: '1000.00',
        paidBookings: 30,
        cost: '400.00',
        margin: '600.00',
      },
      {
        currency: 'VND',
        total: '1200000',
        paidBookings: 10,
        cost: '500000',
        margin: '700000',
      },
    ],
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  expect(byKey.revenue.marginByCurrency).toEqual([
    `Margin ${formatMoney('600.00', 'USD')}`,
    `Margin ${formatMoney('700000', 'VND')}`,
  ]);
  expect(byKey.revenue.marginFootnote).toBe(
    'Margin is an upper bound until every tour has a cost price.',
  );
  expect(byKey.bookings.marginByCurrency).toBeUndefined();
});

test('computeCardModels: no margin lines/footnote when revenueByCurrency is missing', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: null,
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
  expect(byKey.revenue.marginByCurrency).toBeUndefined();
  expect(byKey.revenue.marginFootnote).toBeUndefined();
});

test('computeCardModels: no extraCurrencies footnote when revenueByCurrency is missing', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: null,
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));
  expect(byKey.revenue.extraCurrencies).toBeUndefined();
});

test('formatPct / formatMoney', () => {
  expect(formatPct(0.8)).toBe('80%');
  expect(formatMoney('1000', 'USD')).toMatch(/\$1,000/);
});

test('currencyAffixes: symbol placement from Intl (prefix for USD, EUR suffix-safe)', () => {
  expect(currencyAffixes('USD')).toEqual({ prefix: '$', suffix: '' });
  // Whatever Intl decides for the locale, prefix + 1,234.56 + suffix must round-trip
  // to the exact formatMoney output (the ticker's final frame must match the SSR value).
  const { prefix, suffix } = currencyAffixes('EUR');
  const body = (1234.56).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  expect(`${prefix}${body}${suffix}`).toBe(formatMoney(1234.56, 'EUR'));
});

test('computeCardModels: every card carries a ticker matching its formatted value', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: 0.25,
  };
  const cards = computeCardModels(overview, []);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  expect(byKey.revenue.ticker).toEqual({
    value: 1000,
    prefix: '$',
    suffix: '',
    decimals: 2,
  });
  expect(byKey.bookings.ticker).toEqual({
    value: 50,
    prefix: '',
    suffix: '',
    decimals: 0,
  });
  expect(byKey.conversion.ticker).toEqual({
    value: 80,
    prefix: '',
    suffix: '%',
    decimals: 0,
  });
  expect(byKey.aov.ticker).toEqual({
    value: 25,
    prefix: '$',
    suffix: '',
    decimals: 2,
  });

  // The ticker's final rendered frame must equal the card's SSR string.
  for (const c of cards) {
    const body = c.ticker.value.toLocaleString('en-US', {
      minimumFractionDigits: c.ticker.decimals,
      maximumFractionDigits: c.ticker.decimals,
    });
    expect(`${c.ticker.prefix}${body}${c.ticker.suffix}`).toBe(c.value);
  }
});

describe('bookingsPipeline', () => {
  it('returns all five statuses in fixed order with shares of the total', () => {
    const rows = bookingsPipeline({
      PENDING: 1,
      PAID: 3,
      CANCELLED: 0,
      REFUNDED: 0,
      PARTIALLY_REFUNDED: 0,
    });
    expect(rows.map((r) => r.status)).toEqual([
      'PENDING',
      'PAID',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
    ]);
    expect(rows[1]).toEqual({
      status: 'PAID',
      label: 'Paid',
      count: 3,
      pct: 0.75,
    });
  });

  it('counts PARTIALLY_REFUNDED into the total (regression: 38-vs-37 drift)', () => {
    // Real shape of the reported bug: 26+0+7+4 visible + 1 partial "lost".
    const rows = bookingsPipeline({
      PENDING: 0,
      PAID: 26,
      CANCELLED: 7,
      REFUNDED: 4,
      PARTIALLY_REFUNDED: 1,
    });
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(38);
    const partial = rows.find((r) => r.status === 'PARTIALLY_REFUNDED');
    expect(partial).toEqual({
      status: 'PARTIALLY_REFUNDED',
      label: 'Partially refunded',
      count: 1,
      pct: 1 / 38,
    });
    // Shares are computed against the FULL total, partial included.
    expect(rows.find((r) => r.status === 'PAID')?.pct).toBeCloseTo(26 / 38);
    expect(rows.reduce((sum, r) => sum + r.pct, 0)).toBeCloseTo(1);
  });

  it('is zero-safe when there are no bookings', () => {
    const rows = bookingsPipeline({
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
      REFUNDED: 0,
      PARTIALLY_REFUNDED: 0,
    });
    expect(rows.every((r) => r.count === 0 && r.pct === 0)).toBe(true);
  });
});
