'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import { Receipt } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@tourism/ui';

import { formatMoney, type BookingStatus } from '../../lib/bookings/format';
import type { Booking } from '../../lib/bookings/data';
import { BookingStatusBadge } from './booking-status-badge';
import { BookingsFilters } from './bookings-filters';
import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';

/** Short date like "15 Aug 2026" from an ISO/`YYYY-MM-DD` string; em dash when unparseable. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

const bookingColumns: ColumnDef<Booking>[] = [
  {
    id: 'code',
    header: 'Code',
    enableHiding: false,
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
    id: 'tour',
    header: 'Tour',
    meta: { label: 'Tour' },
    cell: ({ row }) => (
      <span className="text-muted-foreground block max-w-56 truncate">
        {row.original.tour.title}
      </span>
    ),
  },
  {
    id: 'guest',
    header: 'Guest',
    meta: { label: 'Guest' },
    cell: ({ row }) => (
      <>
        <span className="block font-medium">{row.original.contactName}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.contactEmail}
        </span>
      </>
    ),
  },
  {
    id: 'travelDate',
    header: 'Travel date',
    meta: { label: 'Travel date' },
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {shortDate(row.original.departure.startDate)}
      </span>
    ),
  },
  {
    id: 'payment',
    header: 'Payment',
    meta: { label: 'Payment' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.paymentProvider === 'STRIPE' ? 'Stripe' : 'PayPal'}
      </span>
    ),
  },
  {
    id: 'total',
    header: 'Total',
    meta: { label: 'Total', align: 'right' },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.totalAmount, row.original.currency)}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => <BookingStatusBadge status={row.original.status} />,
  },
];

/**
 * Read-only bookings table on TanStack. Rows link to the detail page by code; filtering/paging stay
 * URL-driven (`BookingsFilters` writes the params, the page fetches server-side), so the table runs
 * in manual mode and owns only the column model. The toolbar (tabs · search · Columns) is ONE row —
 * the catalog-table template — so the empty state also lives here, under a toolbar that never hides.
 */
export function BookingsTable({
  rows,
  status,
  search,
  filtered,
}: {
  rows: Booking[];
  status: 'all' | BookingStatus;
  search: string;
  /** Any server-side filter active (status/search/userId) — switches the empty-state hint. */
  filtered: boolean;
}) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: rows,
    columns: bookingColumns,
    state: { columnVisibility },
    manualPagination: true,
    manualFiltering: true,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <BookingsFilters
        status={status}
        search={search}
        trailing={<ColumnsMenu table={table} />}
      />

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No bookings found</EmptyTitle>
            <EmptyDescription>
              {filtered
                ? 'Try a different status or clear the search to see them all.'
                : 'Bookings will appear here as travellers reserve tours.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AdminTableShell table={table} />
      )}
    </div>
  );
}

export default BookingsTable;
