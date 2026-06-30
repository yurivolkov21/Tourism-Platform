import Link from 'next/link';

import { Button } from '@tourism/ui';

export interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Shared admin list pagination — "Showing X–Y of Z" + prev/next (server-side via URL links). */
export function AdminListPagination({
  meta,
  hrefFor,
}: {
  meta: ListMeta;
  hrefFor: (page: number) => string;
}) {
  if (meta.totalPages <= 1) return null;

  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  const atStart = meta.page <= 1;
  const atEnd = meta.page >= meta.totalPages;

  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Showing {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          Page {meta.page} of {meta.totalPages}
        </span>
        {atStart ? (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={hrefFor(meta.page - 1)} />}>
            Previous
          </Button>
        )}
        {atEnd ? (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={hrefFor(meta.page + 1)} />}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export default AdminListPagination;
