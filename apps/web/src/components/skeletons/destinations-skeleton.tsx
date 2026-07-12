import { Skeleton } from '@tourism/ui';

/** Loading placeholder for `/destinations` — hero + two region-group card bands. */
export function DestinationsSkeleton() {
  return (
    <main>
      <Skeleton className="h-72 w-full rounded-none lg:h-88" />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="space-y-6">
            <Skeleton className="h-8 w-56" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default DestinationsSkeleton;
