import { Skeleton } from '@tourism/ui';

/**
 * Route-level loading placeholder for the dashboard: mirrors the page grid — 4 KPI
 * cards, the interactive chart card, the 3-widget grid, and the recent-bookings table
 * band. Static markup — the pulse comes from the ui Skeleton.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            data-testid="skeleton-kpi"
            className="space-y-3 rounded-xl border p-6"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div className="px-4 lg:px-6">
        <div
          data-testid="skeleton-chart"
          className="space-y-4 rounded-xl border p-6"
        >
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid gap-4 px-4 md:grid-cols-2 xl:grid-cols-3 lg:px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            data-testid="skeleton-widget"
            className="space-y-3 rounded-xl border p-6"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ))}
      </div>

      {/* Recent bookings table band */}
      <div className="px-4 lg:px-6">
        <div className="space-y-3 rounded-xl border p-6">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
