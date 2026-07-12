import { BadRequestException, Logger } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { AdminStatsService } from './admin-stats.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

// The service issues its Promise.all in this exact order — the mock chaining
// below must match it 1:1:
//   1. booking.groupBy(['status'])                    → statusGroups
//   2. booking.groupBy(['currency'], PAID)             → currencyGroups
//   3. booking.groupBy(['tourId','currency'], PAID)    → topRevenue
//   4. review.groupBy(['tourId'])                      → topRating
//   5. wishlist.groupBy(['tourId'])                    → topWishlist
//   6. $queryRaw — monthly trend                       → monthlyRows
//   7. $queryRaw — daily trend                         → dailyRows
//   8. review.count(pending)
//   9. enquiry.count(NEW)
function makePrisma(opts: {
  statusGroups?: Array<{ status: BookingStatus; _count: { _all: number } }>;
  currencyGroups?: Array<{
    currency: string;
    _sum: { totalAmount: Prisma.Decimal | null };
    _count: { _all: number };
  }>;
  topRevenue?: Array<{
    tourId: string;
    currency: string;
    _sum: { totalAmount: Prisma.Decimal | null };
    _count: { _all: number };
  }>;
  topRating?: Array<{
    tourId: string;
    _avg: { rating: number | null };
    _count: { _all: number };
  }>;
  topWishlist?: Array<{ tourId: string; _count: { _all: number } }>;
  monthlyRows?: Array<{
    month: Date;
    currency: string;
    bookings: bigint;
    paid: bigint;
    revenue: Prisma.Decimal | null;
  }>;
  dailyRows?: Array<{
    day: Date;
    currency: string;
    bookings: bigint;
    revenue: Prisma.Decimal | null;
  }>;
  tours?: Array<{ id: string; slug: string; title: string }>;
  pendingReviews?: number;
  newEnquiries?: number;
}) {
  const bookingGroupBy = jest
    .fn()
    .mockResolvedValueOnce(opts.statusGroups ?? [])
    .mockResolvedValueOnce(opts.currencyGroups ?? [])
    .mockResolvedValueOnce(opts.topRevenue ?? []);
  return {
    booking: { groupBy: bookingGroupBy },
    review: {
      groupBy: jest.fn().mockResolvedValue(opts.topRating ?? []),
      count: jest.fn().mockResolvedValue(opts.pendingReviews ?? 0),
    },
    wishlist: { groupBy: jest.fn().mockResolvedValue(opts.topWishlist ?? []) },
    enquiry: { count: jest.fn().mockResolvedValue(opts.newEnquiries ?? 0) },
    tour: { findMany: jest.fn().mockResolvedValue(opts.tours ?? []) },
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce(opts.monthlyRows ?? [])
      .mockResolvedValueOnce(opts.dailyRows ?? []),
  };
}

describe('AdminStatsService.getDashboard', () => {
  it('returns zeroed overview when there are no bookings', async () => {
    const svc = new AdminStatsService(makePrisma({}) as never);
    const result = await svc.getDashboard();
    expect(result.overview.totalBookings).toBe(0);
    expect(result.overview.paidBookings).toBe(0);
    expect(result.overview.conversionRate).toBe(0);
    expect(result.overview.monthOverMonthGrowth).toBeNull();
    expect(result.overview.currency).toBe('USD');
    expect(result.overview.revenueByCurrency).toEqual([]);
    expect(result.bookingsByStatus).toEqual({
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
      REFUNDED: 0,
      PARTIALLY_REFUNDED: 0,
    });
  });

  it('computes conversion rate, status counts, and joins tour metadata (title, currency)', async () => {
    const svc = new AdminStatsService(
      makePrisma({
        statusGroups: [
          { status: BookingStatus.PAID, _count: { _all: 3 } },
          { status: BookingStatus.PENDING, _count: { _all: 2 } },
        ],
        currencyGroups: [
          {
            currency: 'USD',
            _sum: { totalAmount: new Prisma.Decimal('450') },
            _count: { _all: 3 },
          },
        ],
        topRevenue: [
          {
            tourId: 't-1',
            currency: 'USD',
            _sum: { totalAmount: new Prisma.Decimal('450') },
            _count: { _all: 3 },
          },
        ],
        tours: [{ id: 't-1', slug: 'hoi-an', title: 'Hoi An' }],
      }) as never,
    );

    const result = await svc.getDashboard();

    expect(result.overview.totalBookings).toBe(5);
    expect(result.overview.paidBookings).toBe(3);
    expect(result.overview.conversionRate).toBeCloseTo(0.6);
    expect(result.overview.totalRevenue).toBe('450');
    expect(result.overview.currency).toBe('USD');
    expect(result.bookingsByStatus.PAID).toBe(3);
    expect(result.topToursByRevenue[0]).toMatchObject({
      tourId: 't-1',
      slug: 'hoi-an',
      title: 'Hoi An',
      bookingsCount: 3,
      currency: 'USD',
    });
  });

  it('falls back to <unknown> when a top-tour id has no metadata row', async () => {
    const svc = new AdminStatsService(
      makePrisma({
        topRevenue: [
          {
            tourId: 't-gone',
            currency: 'USD',
            _sum: { totalAmount: new Prisma.Decimal('10') },
            _count: { _all: 1 },
          },
        ],
        tours: [],
      }) as never,
    );
    const result = await svc.getDashboard();
    expect(result.topToursByRevenue[0].title).toBe('<unknown>');
    expect(result.topToursByRevenue[0].slug).toBe('<unknown>');
  });

  it('computes monthly trend + MoM growth when 2+ months exist', async () => {
    const svc = new AdminStatsService(
      makePrisma({
        monthlyRows: [
          {
            month: new Date('2026-04-01T00:00:00Z'),
            currency: 'USD',
            bookings: 2n,
            paid: 1n,
            revenue: new Prisma.Decimal('100'),
          },
          {
            month: new Date('2026-05-01T00:00:00Z'),
            currency: 'USD',
            bookings: 4n,
            paid: 3n,
            revenue: new Prisma.Decimal('150'),
          },
        ],
      }) as never,
    );

    const result = await svc.getDashboard();

    expect(result.monthlyTrend).toHaveLength(2);
    expect(result.monthlyTrend[0]).toMatchObject({
      month: '2026-04',
      bookings: 2,
      paidBookings: 1,
      revenue: '100',
    });
    expect(result.overview.monthOverMonthGrowth).toBeCloseTo(0.5);
  });

  it('maps the daily trend (ascending, YYYY-MM-DD, PAID revenue as string)', async () => {
    const svc = new AdminStatsService(
      makePrisma({
        dailyRows: [
          {
            day: new Date('2026-06-28T00:00:00Z'),
            currency: 'USD',
            bookings: 1n,
            revenue: new Prisma.Decimal('120'),
          },
          {
            day: new Date('2026-06-29T00:00:00Z'),
            currency: 'USD',
            bookings: 3n,
            revenue: new Prisma.Decimal('450'),
          },
        ],
      }) as never,
    );

    const result = await svc.getDashboard();

    expect(result.dailyTrend).toHaveLength(2);
    expect(result.dailyTrend[0]).toMatchObject({
      date: '2026-06-28',
      bookings: 1,
      revenue: '120',
    });
    const dates = result.dailyTrend.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('returns pending queue counts (unapproved reviews + NEW enquiries)', async () => {
    const svc = new AdminStatsService(
      makePrisma({ pendingReviews: 3, newEnquiries: 5 }) as never,
    );
    const result = await svc.getDashboard();
    expect(result.pendingCounts).toEqual({ reviews: 3, enquiries: 5 });
  });

  describe('date range', () => {
    it('propagates from/to as UTC gte/lt on every ranged query', async () => {
      const prisma = makePrisma({});
      const svc = new AdminStatsService(prisma as never);

      await svc.getDashboard('2026-06-01', '2026-06-30');

      const expectedRange = {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lt: new Date('2026-07-01T00:00:00.000Z'),
      };
      const bookingGroupBy = prisma.booking.groupBy as jest.Mock;
      expect(bookingGroupBy.mock.calls[0][0].where).toEqual({
        createdAt: expectedRange,
      });
      expect(bookingGroupBy.mock.calls[1][0].where).toMatchObject({
        status: BookingStatus.PAID,
        createdAt: expectedRange,
      });
      expect(bookingGroupBy.mock.calls[2][0].where).toMatchObject({
        status: BookingStatus.PAID,
        createdAt: expectedRange,
      });
      const reviewGroupBy = prisma.review.groupBy as jest.Mock;
      expect(reviewGroupBy.mock.calls[0][0].where).toMatchObject({
        createdAt: expectedRange,
      });
      const wishlistGroupBy = prisma.wishlist.groupBy as jest.Mock;
      expect(wishlistGroupBy.mock.calls[0][0].where).toEqual({
        createdAt: expectedRange,
      });
    });

    it('omits the createdAt clause entirely with no params (byte-identical to the baseline)', async () => {
      const prisma = makePrisma({});
      const svc = new AdminStatsService(prisma as never);

      await svc.getDashboard();

      const bookingGroupBy = prisma.booking.groupBy as jest.Mock;
      expect(bookingGroupBy.mock.calls[0][0].where).toEqual({});
      expect(bookingGroupBy.mock.calls[1][0].where).toEqual({
        status: BookingStatus.PAID,
      });
      const wishlistGroupBy = prisma.wishlist.groupBy as jest.Mock;
      expect(wishlistGroupBy.mock.calls[0][0].where).toEqual({});
    });

    it('rejects from > to with BadRequestException STATS_RANGE_INVALID', async () => {
      const svc = new AdminStatsService(makePrisma({}) as never);
      await expect(
        svc.getDashboard('2026-07-10', '2026-07-01'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a calendar-invalid date string', async () => {
      const svc = new AdminStatsService(makePrisma({}) as never);
      await expect(
        svc.getDashboard('2026-02-30', undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('per-currency aggregation', () => {
    it('picks the dominant currency by PAID-booking count (tie-breaks: total, then A-Z) and exposes revenueByCurrency', async () => {
      const svc = new AdminStatsService(
        makePrisma({
          currencyGroups: [
            {
              currency: 'EUR',
              _sum: { totalAmount: new Prisma.Decimal('900') },
              _count: { _all: 2 },
            },
            {
              currency: 'USD',
              _sum: { totalAmount: new Prisma.Decimal('450') },
              _count: { _all: 5 },
            },
          ],
        }) as never,
      );
      const result = await svc.getDashboard();
      expect(result.overview.currency).toBe('USD');
      expect(result.overview.totalRevenue).toBe('450');
      expect(result.overview.paidBookings).toBe(7); // all currencies summed
      expect(result.overview.revenueByCurrency).toEqual([
        { currency: 'USD', total: '450', paidBookings: 5 },
        { currency: 'EUR', total: '900', paidBookings: 2 },
      ]);
    });

    it('sorts mixed-currency top-tours rows (dominant by revenue desc, then other currencies) and slices to 5', async () => {
      const svc = new AdminStatsService(
        makePrisma({
          currencyGroups: [
            {
              currency: 'USD',
              _sum: { totalAmount: new Prisma.Decimal('1000') },
              _count: { _all: 4 },
            },
          ],
          topRevenue: [
            {
              tourId: 't-eur',
              currency: 'EUR',
              _sum: { totalAmount: new Prisma.Decimal('900') },
              _count: { _all: 1 },
            },
            {
              tourId: 't-usd-lo',
              currency: 'USD',
              _sum: { totalAmount: new Prisma.Decimal('100') },
              _count: { _all: 1 },
            },
            {
              tourId: 't-usd-hi',
              currency: 'USD',
              _sum: { totalAmount: new Prisma.Decimal('500') },
              _count: { _all: 1 },
            },
          ],
          tours: [
            { id: 't-eur', slug: 't-eur', title: 'Eur Tour' },
            { id: 't-usd-lo', slug: 't-usd-lo', title: 'Usd Lo' },
            { id: 't-usd-hi', slug: 't-usd-hi', title: 'Usd Hi' },
          ],
        }) as never,
      );
      const result = await svc.getDashboard();
      expect(result.topToursByRevenue.map((r) => r.tourId)).toEqual([
        't-usd-hi',
        't-usd-lo',
        't-eur',
      ]);
      expect(result.topToursByRevenue[0].currency).toBe('USD');
      expect(result.topToursByRevenue[2].currency).toBe('EUR');
    });

    it('trend reducers: bookings sum all currencies, revenue is the dominant currency only', async () => {
      const svc = new AdminStatsService(
        makePrisma({
          currencyGroups: [
            {
              currency: 'USD',
              _sum: { totalAmount: new Prisma.Decimal('100') },
              _count: { _all: 1 },
            },
          ],
          monthlyRows: [
            {
              month: new Date('2026-05-01T00:00:00Z'),
              currency: 'USD',
              bookings: 2n,
              paid: 1n,
              revenue: new Prisma.Decimal('100'),
            },
            {
              month: new Date('2026-05-01T00:00:00Z'),
              currency: 'EUR',
              bookings: 1n,
              paid: 1n,
              revenue: new Prisma.Decimal('900'),
            },
          ],
          dailyRows: [
            {
              day: new Date('2026-06-28T00:00:00Z'),
              currency: 'USD',
              bookings: 1n,
              revenue: new Prisma.Decimal('120'),
            },
            {
              day: new Date('2026-06-28T00:00:00Z'),
              currency: 'EUR',
              bookings: 2n,
              revenue: new Prisma.Decimal('900'),
            },
          ],
        }) as never,
      );
      const result = await svc.getDashboard();
      expect(result.monthlyTrend[0]).toMatchObject({
        bookings: 3,
        paidBookings: 2,
        revenue: '100',
      });
      expect(result.dailyTrend[0]).toMatchObject({
        bookings: 3,
        revenue: '120',
      });
    });
  });

  // The 90-day clamp arithmetic itself (incl. "to-from > 90d → start
  // clamped") is TDD'd directly and exhaustively on the pure
  // `clampDailyWindow` helper in admin-stats.helpers.spec.ts — no need to
  // re-derive it here against $queryRaw's SQL fragment internals.
});
