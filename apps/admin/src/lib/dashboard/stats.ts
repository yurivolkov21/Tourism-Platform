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
    revenueByCurrency: {
      currency: string;
      total: string;
      paidBookings: number;
      /** Σ tour costPrice × travellers over the same PAID set (API-W3); 0 when tours lack costPrice. */
      cost: string;
      /** total − cost. An upper bound until every tour has costPrice filled in. */
      margin: string;
    }[];
  };
  bookingsByStatus: Record<
    'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED',
    number
  >;
  topToursByRevenue: {
    tourId: string;
    slug: string;
    title: string;
    revenue: string;
    bookingsCount: number;
    currency?: string;
  }[];
  topToursByRating: {
    tourId: string;
    slug: string;
    title: string;
    averageRating: number;
    reviewsCount: number;
  }[];
  topToursByWishlist: {
    tourId: string;
    slug: string;
    title: string;
    wishlistCount: number;
  }[];
  monthlyTrend: {
    month: string;
    bookings: number;
    paidBookings: number;
    revenue: string;
  }[];
  dailyTrend: { date: string; bookings: number; revenue: string }[];
  pendingCounts: { reviews: number; enquiries: number } | null;
}

/**
 * Fetches the wide admin dashboard payload with the current admin token. Unwraps the envelope.
 * `from`/`to` (`YYYY-MM-DD`, both optional/independent) scope every ranged aggregate server-side;
 * omitting both keeps the original all-time output.
 */
export async function getDashboardStats(
  from?: string,
  to?: string,
): Promise<DashboardStats> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/stats/dashboard', {
    params: { query: { from, to } },
  });
  const payload = (data as unknown as { data: DashboardStats }).data;
  // New BE fields — default them so the dashboard never crashes against an API
  // instance that hasn't shipped them yet (e.g. a fresh FE hitting a lagging Render).
  return {
    ...payload,
    overview: {
      ...payload.overview,
      revenueByCurrency: (payload.overview.revenueByCurrency ?? []).map(
        (entry) => ({
          ...entry,
          cost: entry.cost ?? '0',
          margin: entry.margin ?? '0',
        }),
      ),
    },
    dailyTrend: payload.dailyTrend ?? [],
    topToursByRating: payload.topToursByRating ?? [],
    topToursByWishlist: payload.topToursByWishlist ?? [],
    pendingCounts: payload.pendingCounts ?? null,
  };
}
