import { ChartAreaInteractive } from '../../components/dashboard/chart-area-interactive';
import { DataTable } from '../../components/dashboard/data-table';
import { SectionCards } from '../../components/dashboard/section-cards';
import { BookingsPipeline } from '../../components/dashboard/bookings-pipeline';
import { NeedsAttention } from '../../components/dashboard/needs-attention';
import { TopToursCard } from '../../components/dashboard/top-tours-card';
import { getRecentBookings } from '../../lib/dashboard/bookings-table';
import { getDashboardStats } from '../../lib/dashboard/stats';
import { computeCardModels } from '../../lib/dashboard/transforms';
import { ErrorAlert } from '../../components/crud/error-alert';

export default async function DashboardPage() {
  const [stats, bookings] = await Promise.all([
    getDashboardStats().catch(() => null),
    getRecentBookings(50).catch(() => null),
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {stats ? (
        <>
          <SectionCards
            cards={computeCardModels(stats.overview, stats.monthlyTrend)}
          />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive daily={stats.dailyTrend} />
          </div>
          <div className="grid gap-4 px-4 md:grid-cols-2 xl:grid-cols-3 lg:px-6">
            <BookingsPipeline byStatus={stats.bookingsByStatus} />
            <TopToursCard
              byRevenue={stats.topToursByRevenue}
              byRating={stats.topToursByRating}
              byWishlist={stats.topToursByWishlist}
              currency={stats.overview.currency}
            />
            {stats.pendingCounts ? (
              <NeedsAttention counts={stats.pendingCounts} />
            ) : null}
          </div>
        </>
      ) : (
        <ErrorAlert className="mx-4 lg:mx-6">
          Couldn’t load stats. The API may be waking up — refresh in a moment.
        </ErrorAlert>
      )}

      <div className="px-4 lg:px-6">
        <DataTable rows={bookings ?? []} />
      </div>
    </div>
  );
}
