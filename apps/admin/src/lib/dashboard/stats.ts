import { getApiClient } from '../api/client';

// Shape of `GET /admin/stats/dashboard` (mirrors AdminStatsResponseDto). Declared locally because
// the generated OpenAPI client's response typing isn't uniform yet; the runtime payload is correct.
// `dailyTrend` was added by the BE (90-day series) — the chart slices it to 90/30/7 days.
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
  topToursByRevenue: {
    tourId: string;
    slug: string;
    title: string;
    revenue: string;
    bookingsCount: number;
  }[];
  monthlyTrend: { month: string; bookings: number; revenue: string }[];
  dailyTrend: { date: string; bookings: number; revenue: string }[];
}

/** Fetches the wide admin dashboard payload with the current admin token. Unwraps the envelope. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/stats/dashboard', {});
  return (data as unknown as { data: DashboardStats }).data;
}
