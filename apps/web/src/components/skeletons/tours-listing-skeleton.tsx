import { Skeleton } from '@tourism/ui';

/** Loading placeholder for `/tours` — hero band + facet sidebar + stacked list cards. */
export function ToursListingSkeleton() {
  return (
    <main>
      <div className="bg-muted/30 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl space-y-3 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
          <div className="hidden space-y-6 lg:block">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <Skeleton className="mb-6 h-11 w-full rounded-full" />
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-9 w-44" />
            </div>
            <div className="flex flex-col gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 rounded-2xl border p-4">
                  <Skeleton className="size-40 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-3 py-2">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ToursListingSkeleton;
