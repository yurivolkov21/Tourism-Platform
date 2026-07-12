import { Skeleton } from '@tourism/ui';

/** Loading placeholder for `/blog/[slug]` — cover band + title/meta + prose lines. */
export function ArticleSkeleton() {
  return (
    <main>
      <Skeleton className="h-72 w-full rounded-none lg:h-96" />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:max-w-5xl lg:py-14">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-10 w-full" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-10 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className={i % 4 === 3 ? 'h-4 w-3/5' : 'h-4 w-full'}
            />
          ))}
        </div>
      </article>
    </main>
  );
}

export default ArticleSkeleton;
