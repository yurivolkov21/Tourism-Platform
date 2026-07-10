import { Skeleton } from '@tourism/ui';

/** Streams while the slot catalog loads — mirrors the grouped card grid. */
export default function AppearanceLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-xl border p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
