import { getApiClient } from '../api/client';

// Shape of `GET /admin/stats` (mirrors AdminStatsResponseDto). Declared locally because the generated
// OpenAPI client's response typing isn't uniform yet (see @tourism/core client.ts note) — `/regen-types`
// against the running API will let us drop the cast later. Runtime payload is already correct.
export interface DashboardStats {
  overview: {
    totalRevenue: string;
    currency: string;
    totalBookings: number;
    paidBookings: number;
    conversionRate: number;
    monthOverMonthGrowth: number | null;
  };
  bookingsByStatus: Record<'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED', number>;
  topToursByRevenue: { tourId: string; slug: string; title: string; revenue: string; bookingsCount: number }[];
  topToursByRating: { tourId: string; slug: string; title: string; averageRating: number; reviewsCount: number }[];
  topToursByWishlist: { tourId: string; slug: string; title: string; wishlistCount: number }[];
  monthlyTrend: { month: string; bookings: number; revenue: string }[];
}

/** Fetches the wide admin dashboard payload (`GET /admin/stats`) with the current admin token. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/stats/dashboard', {});
  return data as unknown as DashboardStats;
}
