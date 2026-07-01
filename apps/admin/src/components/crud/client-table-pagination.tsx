'use client';

import type { Table } from '@tanstack/react-table';

import { DataTablePagination } from './data-table-pagination';

/**
 * Binds the presentational {@link DataTablePagination} to a client-side TanStack table instance —
 * the mirror of {@link ServerTablePagination} (which drives the URL). Page + size live in the table's
 * pagination state; `total` is the filtered row count so "Showing X–Y of Z" reflects active filters.
 * Used by the in-memory client tables (Tours, Destinations, Categories).
 */
export function ClientTablePagination<T>({ table }: { table: Table<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  return (
    <DataTablePagination
      page={pageIndex + 1}
      pageCount={table.getPageCount()}
      total={table.getFilteredRowModel().rows.length}
      pageSize={pageSize}
      onPageChange={(p) => table.setPageIndex(p - 1)}
      onPageSizeChange={(s) => table.setPageSize(s)}
    />
  );
}

export default ClientTablePagination;
