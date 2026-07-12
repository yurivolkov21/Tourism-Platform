import { Skeleton } from '@tourism/ui';

/** Loading placeholder for `/tours/[slug]` — hero + body column + sticky booking aside. */
export function TourDetailSkeleton() {
  return (
    <main>
      <Skeleton className="h-88 w-full rounded-none lg:h-112" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-12">
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="mt-10 lg:mt-0">
            <div className="space-y-4 rounded-2xl border p-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default TourDetailSkeleton;
