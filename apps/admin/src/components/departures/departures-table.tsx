'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import {
  Badge,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  cn,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deleteDeparture } from '../../lib/departures/actions';
import type { Departure } from '../../lib/departures/data';
import { isDeparturePast, toDateOnly } from '../../lib/departures/format';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';

type Tab = 'all' | 'OPEN' | 'CLOSED' | 'CANCELLED';

const STATUS_VARIANT: Record<Departure['status'], 'default' | 'secondary' | 'destructive'> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

/** Formats a departure's effective per-person price, or "Tour base" when it inherits the tour price. */
function price(value: string | null | undefined, currency: string): string {
  if (!value) return 'Tour base';
  const n = Number(value);
  const body = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : value;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}

/**
 * Client-side Departures table on TanStack — the per-tour schedule. Mirrors the other admin tables:
 * status tabs with counts + the "Columns" button + in-memory pagination + ⋮ row actions. Past
 * departures (started before today) show a muted "Departed" chip and dimmed dates — they're already
 * unbookable (see the departures past-date guards), so this only makes that visible.
 */
export function DeparturesTable({
  rows,
  slug,
  currency,
}: {
  rows: Departure[];
  slug: string;
  currency: string;
}) {
  const [tab, setTab] = useState<Tab>('all');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const counts = useMemo(
    () => ({
      all: rows.length,
      OPEN: rows.filter((r) => r.status === 'OPEN').length,
      CLOSED: rows.filter((r) => r.status === 'CLOSED').length,
      CANCELLED: rows.filter((r) => r.status === 'CANCELLED').length,
    }),
    [rows],
  );

  const filtered = useMemo(
    () => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)),
    [rows, tab],
  );

  const columns = useMemo<ColumnDef<Departure>[]>(
    () => [
      {
        id: 'start',
        header: 'Start',
        enableHiding: false,
        meta: { label: 'Start' },
        cell: ({ row }) => (
          <Link
            href={`/tours/${slug}/departures/${row.original.id}`}
            className={cn(
              'hover:text-primary font-medium tabular-nums hover:underline',
              isDeparturePast(row.original.startDate) && 'text-muted-foreground',
            )}
          >
            {toDateOnly(row.original.startDate)}
          </Link>
        ),
      },
      {
        id: 'end',
        header: 'End',
        meta: { label: 'End' },
        cell: ({ row }) => (
          <span
            className={cn(
              'tabular-nums',
              isDeparturePast(row.original.startDate) && 'text-muted-foreground',
            )}
          >
            {toDateOnly(row.original.endDate)}
          </span>
        ),
      },
      {
        id: 'seats',
        header: 'Seats',
        meta: { label: 'Seats', align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.seatsBooked}/{row.original.seatsTotal}
          </span>
        ),
      },
      {
        id: 'price',
        header: 'Price',
        meta: { label: 'Price', align: 'right' },
        cell: ({ row }) => (
          <>
            <span className={row.original.priceOverride ? 'font-medium tabular-nums' : 'text-muted-foreground'}>
              {price(row.original.priceOverride, currency)}
            </span>
            {row.original.compareAtPrice ? (
              <span className="text-muted-foreground ml-1 text-xs line-through">
                {price(row.original.compareAtPrice, currency)}
              </span>
            ) : null}
          </>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
            {isDeparturePast(row.original.startDate) ? (
              <Badge variant="outline" className="text-muted-foreground gap-1">
                <CalendarRange className="size-3" aria-hidden />
                Departed
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <RowActions
            editHref={`/tours/${slug}/departures/${row.original.id}/edit`}
            deleteAction={(id) => deleteDeparture(slug, id)}
            deleteId={row.original.id}
            deleteTitle={`Delete departure ${toDateOnly(row.original.startDate)} → ${toDateOnly(row.original.endDate)}?`}
            deleteDescription="This permanently removes the departure and can’t be undone. A departure with existing bookings can’t be deleted — cancel it instead so booking history is preserved."
          />
        ),
      },
    ],
    [slug, currency],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { columnVisibility },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'OPEN', label: 'Open', count: counts.OPEN },
    { value: 'CLOSED', label: 'Closed', count: counts.CLOSED },
    { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
        >
          {tabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.value)}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {t.label}
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {t.count}
                </Badge>
              </button>
            );
          })}
        </div>

        <ColumnsMenu table={table} />
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRange />
            </EmptyMedia>
            <EmptyTitle>No departures with this status</EmptyTitle>
            <EmptyDescription>Try a different tab, or add a departure date.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <AdminTableShell table={table} />
          <ClientTablePagination table={table} />
        </>
      )}
    </div>
  );
}

export default DeparturesTable;
