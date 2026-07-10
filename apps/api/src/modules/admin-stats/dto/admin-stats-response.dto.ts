import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

class StatsOverviewDto {
  @ApiProperty({
    example: '12450.00',
    description: 'Sum of PAID totals (string Decimal)',
  })
  totalRevenue!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 87 })
  totalBookings!: number;

  @ApiProperty({ example: 61 })
  paidBookings!: number;

  @ApiProperty({
    example: 0.7,
    description: 'paid / total (0 when no bookings)',
  })
  conversionRate!: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 0.18,
    description: 'Last vs prior month revenue; null if <2 months',
  })
  monthOverMonthGrowth!: number | null;
}

class TopTourByRevenueDto {
  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Old Town Walking Tour' })
  title!: string;

  @ApiProperty({ example: '4500.00' })
  revenue!: string;

  @ApiProperty({ example: 30 })
  bookingsCount!: number;
}

class TopTourByRatingDto {
  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Old Town Walking Tour' })
  title!: string;

  @ApiProperty({ example: 4.8 })
  averageRating!: number;

  @ApiProperty({ example: 24 })
  reviewsCount!: number;
}

class TopTourByWishlistDto {
  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Old Town Walking Tour' })
  title!: string;

  @ApiProperty({ example: 42 })
  wishlistCount!: number;
}

class MonthlyTrendPointDto {
  @ApiProperty({ example: '2026-05' })
  month!: string;

  @ApiProperty({ example: 18 })
  bookings!: number;

  @ApiProperty({ example: 12 })
  paidBookings!: number;

  @ApiProperty({ example: '2700.00' })
  revenue!: string;
}

class DailyTrendPointDto {
  @ApiProperty({ example: '2026-06-30' })
  date!: string;

  @ApiProperty({ example: 3 })
  bookings!: number;

  @ApiProperty({ example: '450.00' })
  revenue!: string;
}

class PendingCountsDto {
  @ApiProperty({ example: 3, description: 'Reviews awaiting approval' })
  reviews!: number;

  @ApiProperty({
    example: 5,
    description: 'Enquiries still in the NEW pipeline stage',
  })
  enquiries!: number;
}

/** Wide dashboard payload — the admin FE renders the whole page from one fetch. */
export class AdminStatsResponseDto {
  @ApiProperty({ type: StatsOverviewDto })
  overview!: StatsOverviewDto;

  @ApiProperty({
    description: 'Booking count keyed by status',
    example: { PENDING: 12, PAID: 61, CANCELLED: 9, REFUNDED: 5 },
  })
  bookingsByStatus!: Record<BookingStatus, number>;

  @ApiProperty({ type: [TopTourByRevenueDto] })
  topToursByRevenue!: TopTourByRevenueDto[];

  @ApiProperty({ type: [TopTourByRatingDto] })
  topToursByRating!: TopTourByRatingDto[];

  @ApiProperty({ type: [TopTourByWishlistDto] })
  topToursByWishlist!: TopTourByWishlistDto[];

  @ApiProperty({ type: [MonthlyTrendPointDto] })
  monthlyTrend!: MonthlyTrendPointDto[];

  @ApiProperty({ type: [DailyTrendPointDto] })
  dailyTrend!: DailyTrendPointDto[];

  @ApiProperty({ type: PendingCountsDto })
  pendingCounts!: PendingCountsDto;
}
