import { Skeleton } from '@tourism/ui';

/** One settings group: the label column on the left, the content panel on the right. */
function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-5 py-8 lg:grid-cols-3 lg:gap-10">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="lg:col-span-2">
        <div className="divide-y rounded-2xl border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-4 px-5 py-5 sm:px-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder for `/account/profile` (force-dynamic) — header + the four settings groups. */
export function AccountSettingsSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Skeleton className="h-4 w-32" />

      <div className="mt-4 mb-2 space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="divide-y">
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={1} />
      </div>
    </main>
  );
}

export default AccountSettingsSkeleton;
