import { Injectable } from '@nestjs/common';
import { BookingStatus, EnquiryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  clampDailyWindow,
  CurrencyGroupRow,
  DailyTrendPoint,
  DailyTrendRow,
  MonthlyTrendPoint,
  MonthlyTrendRow,
  pickDominantCurrency,
  rangeWhere,
  reduceDailyRows,
  reduceMonthlyRows,
  resolveRangeBounds,
  sortCurrencyGroups,
  sortTopRevenueRows,
  TopRevenueRow,
} from './admin-stats.helpers';

/** Raw `$queryRaw` row for the per-currency cost aggregate (API-W3). */
interface CostGroupRow {
  currency: string;
  cost: unknown;
}

export interface AdminStatsResponse {
  overview: {
    totalRevenue: string;
    currency: string;
    totalBookings: number;
    paidBookings: number;
    conversionRate: number;
    monthOverMonthGrowth: number | null;
    revenueByCurrency: Array<{
      currency: string;
      total: string;
      paidBookings: number;
      /**
       * Σ costPrice × travellers over the same PAID set (API-W3). Tours
       * without costPrice contribute 0 → `margin` is an upper bound.
       */
      cost: string;
      margin: string;
    }>;
  };
  bookingsByStatus: Record<BookingStatus, number>;
  topToursByRevenue: Array<{
    tourId: string;
    slug: string;
    title: string;
    revenue: string;
    bookingsCount: number;
    currency: string;
  }>;
  topToursByRating: Array<{
    tourId: string;
    slug: string;
    title: string;
    averageRating: number;
    reviewsCount: number;
  }>;
  topToursByWishlist: Array<{
    tourId: string;
    slug: string;
    title: string;
    wishlistCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    bookings: number;
    paidBookings: number;
    revenue: string;
  }>;
  dailyTrend: Array<{ date: string; bookings: number; revenue: string }>;
  pendingCounts: { reviews: number; enquiries: number };
}

/**
 * Read-only admin dashboard aggregator (adapted from donor; EN-only `title`).
 *
 * Strategy:
 *  - Typed `groupBy`/`aggregate` for most slices (type safety + index use on
 *    `bookings(status, created_at)`, `reviews(tour_id, is_approved)`).
 *  - Monthly/daily trend via `$queryRaw` (`date_trunc` isn't expressible in
 *    groupBy); `Prisma.sql` with interpolated `Date` params — Prisma
 *    parameterizes, so this stays injection-safe.
 *  - Everything runs in parallel via `Promise.all` — read-only, pooler-safe.
 *
 * Date range: optional `?from&to` (`YYYY-MM-DD`, UTC day bounds) narrows
 * `booking`/`review`/`wishlist` slices by their own `createdAt`. No params →
 * every ranged query omits the `createdAt` clause entirely, so the output is
 * byte-identical to the no-range baseline. `monthlyTrend`/MoM and
 * `pendingCounts` are unaffected by the range (fixed window / current-state).
 *
 * Currency: NO FX. Each currency's PAID bookings are aggregated separately;
 * the "dominant" currency (most PAID bookings in range, ties broken by
 * higher total then currency A→Z) drives `overview.totalRevenue`/`currency`
 * and the single-currency trend charts. `overview.revenueByCurrency` and
 * per-row `topToursByRevenue.currency` expose the rest without ever summing
 * across currencies.
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(from?: string, to?: string): Promise<AdminStatsResponse> {
    const bounds = resolveRangeBounds(from, to);
    const range = rangeWhere(bounds);
    const paidRange = { status: BookingStatus.PAID, ...range };
    const dailyWindow = clampDailyWindow(bounds, new Date());

    const [
      statusGroups,
      currencyGroups,
      topRevenueGroups,
      topRatingGroups,
      topWishlistGroups,
      monthlyRows,
      dailyRows,
      pendingReviews,
      newEnquiries,
      costGroups,
    ] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: range,
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['currency'],
        where: paidRange,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['tourId', 'currency'],
        where: paidRange,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.review.groupBy({
        by: ['tourId'],
        // Only tour-bound (verified) reviews count toward per-tour ratings; curated
        // testimonials have a null tourId.
        where: { isApproved: true, tourId: { not: null }, ...range },
        _avg: { rating: true },
        _count: { _all: true },
        orderBy: { _avg: { rating: 'desc' } },
        take: 5,
      }),
      this.prisma.wishlist.groupBy({
        by: ['tourId'],
        where: range,
        _count: { _all: true },
        orderBy: { _count: { tourId: 'desc' } },
        take: 5,
      }),
      this.prisma.$queryRaw<MonthlyTrendRow[]>(Prisma.sql`
        SELECT
          date_trunc('month', created_at) AS month,
          currency,
          COUNT(*)::bigint AS bookings,
          COUNT(*) FILTER (WHERE status = 'PAID')::bigint AS paid,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) AS revenue
        FROM bookings
        WHERE created_at >= (date_trunc('month', NOW()) - INTERVAL '5 months')
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `),
      // Daily trend, clamped to the (range ∩ most-recent-90-days) window —
      // the FE slices it to 90/30/7 days client-side.
      this.prisma.$queryRaw<DailyTrendRow[]>(Prisma.sql`
        SELECT
          date_trunc('day', created_at) AS day,
          currency,
          COUNT(*)::bigint AS bookings,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) AS revenue
        FROM bookings
        WHERE created_at >= ${dailyWindow.gte}
          ${dailyWindow.lt ? Prisma.sql`AND created_at < ${dailyWindow.lt}` : Prisma.empty}
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `),
      this.prisma.review.count({ where: { isApproved: false } }),
      this.prisma.enquiry.count({ where: { status: EnquiryStatus.NEW } }),
      // Per-currency cost of the same PAID-in-range set (API-W3 margin).
      // Tours without costPrice contribute 0 → margin is an UPPER BOUND
      // until costs are filled in (documented on the DTO).
      this.prisma.$queryRaw<CostGroupRow[]>(Prisma.sql`
        SELECT b.currency,
               COALESCE(SUM(t.cost_price * (b.num_adults + b.num_children)), 0) AS cost
        FROM bookings b
        JOIN tours t ON t.id = b.tour_id
        WHERE b.status = 'PAID'::"BookingStatus"
          AND t.cost_price IS NOT NULL
          ${bounds.gte ? Prisma.sql`AND b.created_at >= ${bounds.gte}` : Prisma.empty}
          ${bounds.lt ? Prisma.sql`AND b.created_at < ${bounds.lt}` : Prisma.empty}
        GROUP BY b.currency
      `),
    ]);

    const bookingsByStatus: Record<BookingStatus, number> = {
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
      REFUNDED: 0,
      PARTIALLY_REFUNDED: 0,
    };
    for (const g of statusGroups) {
      bookingsByStatus[g.status] = g._count._all;
    }
    const totalBookings = Object.values(bookingsByStatus).reduce(
      (a, b) => a + b,
      0,
    );

    const currencyRows: CurrencyGroupRow[] = currencyGroups.map((g) => ({
      currency: g.currency,
      paidBookings: g._count._all,
      total: (g._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
    }));
    const costByCurrency = new Map(
      costGroups.map((c) => [
        c.currency,
        new Prisma.Decimal(String(c.cost ?? 0)),
      ]),
    );
    const revenueByCurrency = sortCurrencyGroups(currencyRows).map((r) => {
      const cost = costByCurrency.get(r.currency) ?? new Prisma.Decimal(0);
      return {
        currency: r.currency,
        total: r.total,
        paidBookings: r.paidBookings,
        cost: cost.toString(),
        margin: new Prisma.Decimal(r.total).minus(cost).toString(),
      };
    });
    const dominant = pickDominantCurrency(currencyRows);
    const paidBookings = currencyRows.reduce(
      (sum, r) => sum + r.paidBookings,
      0,
    );
    const totalRevenue =
      revenueByCurrency.find((r) => r.currency === dominant)?.total ?? '0';
    const conversionRate =
      totalBookings === 0 ? 0 : paidBookings / totalBookings;

    // Resolve tour metadata for the top lists in one round-trip.
    const allTourIds = Array.from(
      new Set(
        [
          ...topRevenueGroups.map((r) => r.tourId),
          ...topRatingGroups.map((r) => r.tourId),
          ...topWishlistGroups.map((r) => r.tourId),
        ].filter((id): id is string => id !== null),
      ),
    );
    const tours =
      allTourIds.length > 0
        ? await this.prisma.tour.findMany({
            where: { id: { in: allTourIds } },
            select: { id: true, slug: true, title: true },
          })
        : [];
    const tourById = new Map(tours.map((t) => [t.id, t]));

    const topRevenueRows: TopRevenueRow[] = topRevenueGroups.map((row) => {
      const t = tourById.get(row.tourId);
      return {
        tourId: row.tourId,
        slug: t?.slug ?? '<unknown>',
        title: t?.title ?? '<unknown>',
        revenue: (row._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
        bookingsCount: row._count._all,
        currency: row.currency,
      };
    });
    const topToursByRevenue = sortTopRevenueRows(topRevenueRows, dominant);
    const topToursByRating = topRatingGroups
      .filter(
        (row): row is typeof row & { tourId: string } => row.tourId !== null,
      )
      .map((row) => {
        const t = tourById.get(row.tourId);
        return {
          tourId: row.tourId,
          slug: t?.slug ?? '<unknown>',
          title: t?.title ?? '<unknown>',
          averageRating: row._avg.rating ?? 0,
          reviewsCount: row._count._all,
        };
      });
    const topToursByWishlist = topWishlistGroups.map((row) => {
      const t = tourById.get(row.tourId);
      return {
        tourId: row.tourId,
        slug: t?.slug ?? '<unknown>',
        title: t?.title ?? '<unknown>',
        wishlistCount: row._count._all,
      };
    });

    const monthlyTrend: MonthlyTrendPoint[] = reduceMonthlyRows(
      monthlyRows,
      dominant,
    );
    const dailyTrend: DailyTrendPoint[] = reduceDailyRows(dailyRows, dominant);

    // MoM growth — last month vs the month before, when both exist.
    let monthOverMonthGrowth: number | null = null;
    if (monthlyTrend.length >= 2) {
      const last = Number(monthlyTrend[monthlyTrend.length - 1].revenue);
      const prev = Number(monthlyTrend[monthlyTrend.length - 2].revenue);
      if (prev > 0) {
        monthOverMonthGrowth = last / prev - 1;
      }
    }

    return {
      overview: {
        totalRevenue,
        currency: dominant,
        totalBookings,
        paidBookings,
        conversionRate,
        monthOverMonthGrowth,
        revenueByCurrency,
      },
      bookingsByStatus,
      topToursByRevenue,
      topToursByRating,
      topToursByWishlist,
      monthlyTrend,
      dailyTrend,
      pendingCounts: { reviews: pendingReviews, enquiries: newEnquiries },
    };
  }
}
