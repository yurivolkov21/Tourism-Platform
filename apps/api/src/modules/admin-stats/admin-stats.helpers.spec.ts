import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  clampDailyWindow,
  pickDominantCurrency,
  rangeWhere,
  reduceDailyRows,
  reduceMonthlyRows,
  resolveRangeBounds,
  sortCurrencyGroups,
  sortTopRevenueRows,
} from './admin-stats.helpers';

describe('resolveRangeBounds', () => {
  it('returns an empty object when both from/to are omitted', () => {
    expect(resolveRangeBounds(undefined, undefined)).toEqual({});
  });

  it('parses "from" as a UTC day start', () => {
    const bounds = resolveRangeBounds('2026-07-01', undefined);
    expect(bounds.gte?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(bounds.lt).toBeUndefined();
  });

  it('parses "to" as the UTC start of the following day (exclusive)', () => {
    const bounds = resolveRangeBounds(undefined, '2026-07-10');
    expect(bounds.lt?.toISOString()).toBe('2026-07-11T00:00:00.000Z');
    expect(bounds.gte).toBeUndefined();
  });

  it('accepts a valid from/to pair', () => {
    const bounds = resolveRangeBounds('2026-07-01', '2026-07-10');
    expect(bounds.gte?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(bounds.lt?.toISOString()).toBe('2026-07-11T00:00:00.000Z');
  });

  it('rejects from > to with STATS_RANGE_INVALID', () => {
    expect(() => resolveRangeBounds('2026-07-10', '2026-07-01')).toThrow(
      BadRequestException,
    );
    try {
      resolveRangeBounds('2026-07-10', '2026-07-01');
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({
        code: 'STATS_RANGE_INVALID',
      });
    }
  });

  it('rejects a calendar-invalid date (e.g. Feb 30) even though it matches the regex', () => {
    expect(() => resolveRangeBounds('2026-02-30', undefined)).toThrow(
      BadRequestException,
    );
  });

  it('rejects an unparsable date string', () => {
    expect(() => resolveRangeBounds('not-a-date', undefined)).toThrow(
      BadRequestException,
    );
  });
});

describe('rangeWhere', () => {
  it('returns {} for empty bounds (no-arg output stays byte-identical)', () => {
    expect(rangeWhere({})).toEqual({});
  });

  it('wraps bounds under createdAt', () => {
    const gte = new Date('2026-07-01T00:00:00.000Z');
    const lt = new Date('2026-07-11T00:00:00.000Z');
    expect(rangeWhere({ gte, lt })).toEqual({ createdAt: { gte, lt } });
  });

  it('omits the missing bound', () => {
    const gte = new Date('2026-07-01T00:00:00.000Z');
    expect(rangeWhere({ gte })).toEqual({ createdAt: { gte } });
  });
});

describe('clampDailyWindow', () => {
  const now = new Date('2026-07-12T00:00:00.000Z');

  it("defaults to now-90d when no bounds are given (today's unchanged behavior)", () => {
    const { gte, lt } = clampDailyWindow({}, now);
    expect(gte.toISOString()).toBe('2026-04-13T00:00:00.000Z');
    expect(lt).toBeUndefined();
  });

  it('clamps a from more than 90 days before "to" to the most recent 90 days', () => {
    const gteIn = new Date('2025-01-01T00:00:00.000Z'); // > 90 days before `to`
    const ltIn = new Date('2026-07-11T00:00:00.000Z'); // exclusive "to" bound
    const { gte, lt } = clampDailyWindow({ gte: gteIn, lt: ltIn }, now);
    expect(lt).toEqual(ltIn);
    // 90 days before the exclusive "to" bound
    expect(gte.toISOString()).toBe('2026-04-12T00:00:00.000Z');
  });

  it('keeps "from" as-is when the range is already within 90 days', () => {
    const gteIn = new Date('2026-07-01T00:00:00.000Z');
    const ltIn = new Date('2026-07-11T00:00:00.000Z');
    const { gte, lt } = clampDailyWindow({ gte: gteIn, lt: ltIn }, now);
    expect(gte).toEqual(gteIn);
    expect(lt).toEqual(ltIn);
  });

  it('clamps against "now" when only "from" is given (no "to")', () => {
    const gteIn = new Date('2025-01-01T00:00:00.000Z');
    const { gte, lt } = clampDailyWindow({ gte: gteIn }, now);
    expect(lt).toBeUndefined();
    expect(gte.toISOString()).toBe('2026-04-13T00:00:00.000Z');
  });

  it('anchors at a past "to" when only "to" is given', () => {
    const ltIn = new Date('2026-07-11T00:00:00.000Z');
    const { gte, lt } = clampDailyWindow({ lt: ltIn }, now);
    expect(lt).toEqual(ltIn);
    expect(gte.toISOString()).toBe('2026-04-12T00:00:00.000Z');
  });

  it('anchors the 90d back-off at "now" when "to" is in the future (deep link) so the window still covers real data', () => {
    const ltIn = new Date('2027-01-01T00:00:00.000Z');
    const { gte, lt } = clampDailyWindow({ lt: ltIn }, now);
    expect(lt).toEqual(ltIn);
    // now - 90d, NOT (future to) - 90d which would blank the chart
    expect(gte.toISOString()).toBe('2026-04-13T00:00:00.000Z');
  });
});

describe('sortCurrencyGroups / pickDominantCurrency', () => {
  it('picks the currency with the most PAID bookings', () => {
    const rows = [
      { currency: 'EUR', paidBookings: 2, total: '900' },
      { currency: 'USD', paidBookings: 5, total: '450' },
    ];
    expect(pickDominantCurrency(rows)).toBe('USD');
  });

  it('breaks a count tie by higher total', () => {
    const rows = [
      { currency: 'EUR', paidBookings: 3, total: '900' },
      { currency: 'USD', paidBookings: 3, total: '450' },
    ];
    expect(pickDominantCurrency(rows)).toBe('EUR');
  });

  it('breaks a count+total tie by currency A-Z', () => {
    const rows = [
      { currency: 'VND', paidBookings: 3, total: '450' },
      { currency: 'AUD', paidBookings: 3, total: '450' },
    ];
    expect(pickDominantCurrency(rows)).toBe('AUD');
  });

  it('defaults to USD when there is no PAID data', () => {
    expect(pickDominantCurrency([])).toBe('USD');
  });

  it('sortCurrencyGroups orders dominant first, ties broken the same way', () => {
    const rows = [
      { currency: 'VND', paidBookings: 3, total: '450' },
      { currency: 'USD', paidBookings: 5, total: '450' },
      { currency: 'AUD', paidBookings: 3, total: '450' },
    ];
    expect(sortCurrencyGroups(rows).map((r) => r.currency)).toEqual([
      'USD',
      'AUD',
      'VND',
    ]);
  });
});

describe('sortTopRevenueRows', () => {
  const row = (
    currency: string,
    revenue: string,
    tourId: string,
  ): {
    tourId: string;
    slug: string;
    title: string;
    revenue: string;
    bookingsCount: number;
    currency: string;
  } => ({
    tourId,
    slug: tourId,
    title: tourId,
    revenue,
    bookingsCount: 1,
    currency,
  });

  it('ranks dominant-currency rows by revenue desc, then other currencies grouped (currency A-Z, revenue desc within group)', () => {
    const rows = [
      row('EUR', '900', 'eur-hi'),
      row('USD', '100', 'usd-lo'),
      row('USD', '500', 'usd-hi'),
      row('AUD', '50', 'aud-lo'),
    ];
    const sorted = sortTopRevenueRows(rows, 'USD');
    expect(sorted.map((r) => r.tourId)).toEqual([
      'usd-hi',
      'usd-lo',
      'aud-lo',
      'eur-hi',
    ]);
  });

  it('slices to the top 5', () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      row('USD', String(8 - i), `t-${i}`),
    );
    expect(sortTopRevenueRows(rows, 'USD')).toHaveLength(5);
  });
});

describe('reduceMonthlyRows', () => {
  it('sums bookings/paid across all currencies but revenue only from the dominant currency', () => {
    const rows = [
      {
        month: new Date('2026-05-01T00:00:00Z'),
        bookings: 3n,
        paid: 2n,
        revenue: new Prisma.Decimal('200'),
        currency: 'USD',
      },
      {
        month: new Date('2026-05-01T00:00:00Z'),
        bookings: 1n,
        paid: 1n,
        revenue: new Prisma.Decimal('900'),
        currency: 'EUR',
      },
    ];
    const result = reduceMonthlyRows(rows, 'USD');
    expect(result).toEqual([
      { month: '2026-05', bookings: 4, paidBookings: 3, revenue: '200' },
    ]);
  });

  it('defaults revenue to "0" when the dominant currency has no row for a bucket', () => {
    const rows = [
      {
        month: new Date('2026-05-01T00:00:00Z'),
        bookings: 1n,
        paid: 1n,
        revenue: new Prisma.Decimal('900'),
        currency: 'EUR',
      },
    ];
    expect(reduceMonthlyRows(rows, 'USD')[0].revenue).toBe('0');
  });

  it('sorts buckets ascending by month', () => {
    const rows = [
      {
        month: new Date('2026-06-01T00:00:00Z'),
        bookings: 1n,
        paid: 1n,
        revenue: new Prisma.Decimal('1'),
        currency: 'USD',
      },
      {
        month: new Date('2026-05-01T00:00:00Z'),
        bookings: 1n,
        paid: 1n,
        revenue: new Prisma.Decimal('1'),
        currency: 'USD',
      },
    ];
    expect(reduceMonthlyRows(rows, 'USD').map((r) => r.month)).toEqual([
      '2026-05',
      '2026-06',
    ]);
  });
});

describe('reduceDailyRows', () => {
  it('sums bookings across currencies, revenue from the dominant currency only', () => {
    const rows = [
      {
        day: new Date('2026-06-28T00:00:00Z'),
        bookings: 1n,
        revenue: new Prisma.Decimal('120'),
        currency: 'USD',
      },
      {
        day: new Date('2026-06-28T00:00:00Z'),
        bookings: 2n,
        revenue: new Prisma.Decimal('900'),
        currency: 'EUR',
      },
    ];
    const result = reduceDailyRows(rows, 'USD');
    expect(result).toEqual([
      { date: '2026-06-28', bookings: 3, revenue: '120' },
    ]);
  });

  it('sorts buckets ascending by date', () => {
    const rows = [
      {
        day: new Date('2026-06-29T00:00:00Z'),
        bookings: 1n,
        revenue: new Prisma.Decimal('1'),
        currency: 'USD',
      },
      {
        day: new Date('2026-06-28T00:00:00Z'),
        bookings: 1n,
        revenue: new Prisma.Decimal('1'),
        currency: 'USD',
      },
    ];
    expect(reduceDailyRows(rows, 'USD').map((r) => r.date)).toEqual([
      '2026-06-28',
      '2026-06-29',
    ]);
  });
});
