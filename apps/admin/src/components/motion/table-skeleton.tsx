import { Skeleton } from '@tourism/ui';

/**
 * Route-level loading placeholder for the admin list pages: mirrors the shared layout
 * (AdminListHeader strip → toolbar row → bordered table with a muted header band and
 * `rows`×`cols` cell placeholders). Static markup — the pulse comes from the ui Skeleton.
 */
export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* AdminListHeader: title + description left, primary action right. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Filter/toolbar strip. */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Table: muted header band + body rows. */}
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            data-testid="skeleton-row"
            className="flex items-center gap-4 border-b px-4 py-3.5 last:border-b-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableSkeleton;
