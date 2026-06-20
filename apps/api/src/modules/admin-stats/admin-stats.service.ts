import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminStatsResponse {
  overview: {
    totalRevenue: string;
    currency: string;
    totalBookings: number;
    paidBookings: number;
    conversionRate: number;
    monthOverMonthGrowth: number | null;
  };
  bookingsByStatus: Record<BookingStatus, number>;
  topToursByRevenue: Array<{
    tourId: string;
    slug: string;
    title: string;
    revenue: string;
    bookingsCount: number;
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
  monthlyTrend: Array<{ month: string; bookings: number; revenue: string }>;
}

interface MonthlyRow {
  month: Date;
  bookings: bigint;
  revenue: Prisma.Decimal | null;
}

/**
 * Read-only admin dashboard aggregator (adapted from donor; EN-only `title`).
 *
 * Strategy:
 *  - Typed `groupBy`/`aggregate` for most slices (type safety + index use on
 *    `bookings(status, created_at)`, `reviews(tour_id, is_approved)`).
 *  - Monthly trend via `$queryRaw` (`date_trunc` isn't expressible in groupBy);
 *    parameter-free literal SQL, no interpolation → injection-safe.
 *  - Everything runs in parallel via `Promise.all` — read-only, pooler-safe.
 *
 * Currency: `totalRevenue` sums raw amounts without FX. The seed is USD-only; if
 * multi-currency lands the field should split per-currency or apply a daily rate.
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminStatsResponse> {
    const [
      statusGroups,
      paidAggregate,
      topRevenueGroups,
      topRatingGroups,
      topWishlistGroups,
      monthlyRows,
    ] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.booking.aggregate({
        where: { status: BookingStatus.PAID },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['tourId'],
        where: { status: BookingStatus.PAID },
        _sum: { totalAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.review.groupBy({
        by: ['tourId'],
        where: { isApproved: true },
        _avg: { rating: true },
        _count: { _all: true },
        orderBy: { _avg: { rating: 'desc' } },
        take: 5,
      }),
      this.prisma.wishlist.groupBy({
        by: ['tourId'],
        _count: { _all: true },
        orderBy: { _count: { tourId: 'desc' } },
        take: 5,
      }),
      this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT
          date_trunc('month', created_at) AS month,
          COUNT(*)::bigint AS bookings,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) AS revenue
        FROM bookings
        WHERE created_at >= (date_trunc('month', NOW()) - INTERVAL '5 months')
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const bookingsByStatus: Record<BookingStatus, number> = {
      PENDING: 0,
      PAID: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };
    for (const g of statusGroups) {
      bookingsByStatus[g.status] = g._count._all;
    }
    const totalBookings = Object.values(bookingsByStatus).reduce(
      (a, b) => a + b,
      0,
    );
    const paidBookings = paidAggregate._count._all;
    const totalRevenue =
      paidAggregate._sum.totalAmount ?? new Prisma.Decimal(0);
    const conversionRate =
      totalBookings === 0 ? 0 : paidBookings / totalBookings;

    // Resolve tour metadata for the top lists in one round-trip.
    const allTourIds = Array.from(
      new Set([
        ...topRevenueGroups.map((r) => r.tourId),
        ...topRatingGroups.map((r) => r.tourId),
        ...topWishlistGroups.map((r) => r.tourId),
      ]),
    );
    const tours =
      allTourIds.length > 0
        ? await this.prisma.tour.findMany({
            where: { id: { in: allTourIds } },
            select: { id: true, slug: true, title: true },
          })
        : [];
    const tourById = new Map(tours.map((t) => [t.id, t]));

    const topToursByRevenue = topRevenueGroups.map((row) => {
      const t = tourById.get(row.tourId);
      return {
        tourId: row.tourId,
        slug: t?.slug ?? '<unknown>',
        title: t?.title ?? '<unknown>',
        revenue: (row._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
        bookingsCount: row._count._all,
      };
    });
    const topToursByRating = topRatingGroups.map((row) => {
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

    const monthlyTrend = monthlyRows.map((row) => ({
      month: row.month.toISOString().slice(0, 7),
      bookings: Number(row.bookings),
      revenue: (row.revenue ?? new Prisma.Decimal(0)).toString(),
    }));

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
        totalRevenue: totalRevenue.toString(),
        currency: 'USD',
        totalBookings,
        paidBookings,
        conversionRate,
        monthOverMonthGrowth,
      },
      bookingsByStatus,
      topToursByRevenue,
      topToursByRating,
      topToursByWishlist,
      monthlyTrend,
    };
  }
}
