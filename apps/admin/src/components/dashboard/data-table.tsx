'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';

import { Badge, Tabs, TabsList, TabsTrigger } from '@tourism/ui';

import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';
import { ColumnsMenu } from '../crud/columns-menu';
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import type {
  AdminBookingRow,
  BookingRowStatus,
} from '../../lib/dashboard/bookings-table';
import { formatDay } from '../../lib/dashboard/transforms';

const STATUS_VARIANT: Record<
  BookingRowStatus,
  'default' | 'outline' | 'secondary' | 'destructive'
> = {
  PAID: 'default',
  PENDING: 'outline',
  CANCELLED: 'secondary',
  REFUNDED: 'destructive',
};
const STATUSES: BookingRowStatus[] = [
  'PAID',
  'PENDING',
  'CANCELLED',
  'REFUNDED',
];

/**
 * Recent-bookings widget for the dashboard, rendered through the shared admin table
 * stack (AdminTableShell + ColumnsMenu + ClientTablePagination) — same look as before,
 * minus the bespoke table/footer markup this widget used to carry.
 */
export function DataTable({ rows }: { rows: AdminBookingRow[] }) {
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('dashboard-bookings');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusTab, setStatusTab] = useState<'all' | BookingRowStatus>('all');

  const columns = useMemo<ColumnDef<AdminBookingRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        meta: { label: 'Code' },
        cell: ({ row }) => (
          <Link
            href={`/bookings/${row.original.code}`}
            className="hover:text-primary font-medium hover:underline"
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'tourTitle',
        header: 'Tour',
        meta: { label: 'Tour' },
        cell: ({ row }) => (
          <span
            className="block max-w-88 truncate"
            title={row.original.tourTitle}
          >
            {row.original.tourTitle}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <Badge
            variant={STATUS_VARIANT[row.original.status]}
            className="capitalize"
          >
            {row.original.status.toLowerCase()}
          </Badge>
        ),
      },
      {
        accessorKey: 'contactName',
        header: 'Customer',
        meta: { label: 'Customer' },
      },
      {
        accessorKey: 'travellers',
        header: 'Travellers',
        meta: { label: 'Travellers' },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.travellers}</span>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Amount',
        meta: { label: 'Amount' },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.totalAmount}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        meta: { label: 'Created' },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDay(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.code,
    state: { columnVisibility, columnFilters, sorting },
    initialState: { pagination: { pageSize: 10 } },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: rows.filter((r) => r.status === s).length }),
    {} as Record<BookingRowStatus, number>,
  );
  const onTab = (value: string) => {
    const v = value as 'all' | BookingRowStatus;
    setStatusTab(v);
    table.getColumn('status')?.setFilterValue(v === 'all' ? undefined : v);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: status tabs + column visibility */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusTab} onValueChange={onTab}>
          <TabsList>
            <TabsTrigger value="all">
              All{' '}
              <Badge variant="secondary" className="ml-1.5">
                {rows.length}
              </Badge>
            </TabsTrigger>
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s.toLowerCase()}{' '}
                <Badge variant="secondary" className="ml-1.5">
                  {counts[s]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ColumnsMenu table={table} />
      </div>

      <AdminTableShell table={table} emptyLabel="No bookings yet." />
      <ClientTablePagination table={table} />
    </div>
  );
}

export default DataTable;
