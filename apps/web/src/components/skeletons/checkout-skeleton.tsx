import { Skeleton } from '@tourism/ui';

/** Loading placeholder for `/checkout/*` (force-dynamic) — centered result-card. */
export function CheckoutSkeleton() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <div className="w-full space-y-3 rounded-2xl border p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
    </main>
  );
}

export default CheckoutSkeleton;
