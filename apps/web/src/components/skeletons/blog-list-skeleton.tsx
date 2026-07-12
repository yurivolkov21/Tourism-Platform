import { Skeleton } from '@tourism/ui';

/** Loading placeholder for `/blog` — heading + topic chips + 3-col post-card grid. */
export function BlogListSkeleton() {
  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default BlogListSkeleton;
