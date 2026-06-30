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

test('computeCardModels: revenue/bookings deltas; conversion/aov have none', () => {
  const overview = {
    totalRevenue: '1000.00',
    currency: 'USD',
    totalBookings: 50,
    paidBookings: 40,
    conversionRate: 0.8,
    monthOverMonthGrowth: 0.25,
  };
  const monthly = [
    { month: '2026-05', bookings: 20, revenue: '800' },
    { month: '2026-06', bookings: 30, revenue: '1000' },
  ];
  const cards = computeCardModels(overview, monthly);
  const byKey = Object.fromEntries(cards.map((c) => [c.key, c]));

  expect(byKey.revenue.delta).toBeCloseTo(0.25);
  expect(byKey.bookings.delta).toBeCloseTo(0.5); // 30 vs 20
  expect(byKey.conversion.delta).toBeNull();
  expect(byKey.aov.delta).toBeNull();
  expect(byKey.aov.value).toBe(formatMoney(25, 'USD')); // 1000 / 40
});

test('computeCardModels: no deltas with <2 months and zero paid bookings', () => {
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
  expect(byKey.aov.value).toBe(formatMoney(0, 'USD'));
});

test('formatPct / formatMoney', () => {
  expect(formatPct(0.8)).toBe('80%');
  expect(formatMoney('1000', 'USD')).toMatch(/\$1,000/);
});
