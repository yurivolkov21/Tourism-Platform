'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { DataTablePagination } from './data-table-pagination';

/**
 * URL-driven wrapper around {@link DataTablePagination} for server-paginated tables (Bookings,
 * Enquiries, Posts). Page + page-size live in the URL (`?page=` / `?pageSize=`); changing the size
 * resets to page 1. Every other query param (status, search) is preserved. `page`/`pageCount`/
 * `total`/`pageSize` come from the server's page-meta.
 */
export function ServerTablePagination({
  page,
  pageCount,
  total,
  pageSize,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const push = (changes: { page?: number; pageSize?: number }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.pageSize !== undefined) {
      next.set('pageSize', String(changes.pageSize));
      next.delete('page');
    }
    if (changes.page !== undefined) {
      if (changes.page <= 1) next.delete('page');
      else next.set('page', String(changes.page));
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <DataTablePagination
      page={page}
      pageCount={pageCount}
      total={total}
      pageSize={pageSize}
      onPageChange={(p) => push({ page: p })}
      onPageSizeChange={(s) => push({ pageSize: s })}
    />
  );
}

export default ServerTablePagination;
