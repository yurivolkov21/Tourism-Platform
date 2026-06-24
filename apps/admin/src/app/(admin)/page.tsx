import { apiErrorMessage } from '../../lib/api/error';
import { getDashboardStats, type DashboardStats } from '../../lib/dashboard/stats';
import { StatCards } from '../../components/dashboard/stat-cards';
import { BookingsPie } from '../../components/dashboard/bookings-pie';
import { TrendBar } from '../../components/dashboard/trend-bar';
import { TopTours } from '../../components/dashboard/top-tours';

export default async function DashboardPage() {
  let stats: DashboardStats | undefined;
  let error: string | null = null;
  try {
    stats = await getDashboardStats();
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      {error || !stats?.overview ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load stats{error ? `: ${error}` : ''}. Check that the API is running and your
          admin session is valid.
        </div>
      ) : (
        <>
          <StatCards overview={stats.overview} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TrendBar data={stats.monthlyTrend} />
            </div>
            <BookingsPie data={stats.bookingsByStatus} />
          </div>
          <TopTours rows={stats.topToursByRevenue} />
        </>
      )}
    </div>
  );
}
