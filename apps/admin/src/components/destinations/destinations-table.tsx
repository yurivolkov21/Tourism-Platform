'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

import {
  Badge,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deleteDestination } from '../../lib/destinations/actions';
import type { Destination } from '../../lib/destinations/data';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import { ColumnsMenu } from '../crud/columns-menu';
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';
import { TabPills } from '../crud/tab-pills';

type Tab = 'all' | 'active' | 'draft';

const destinationColumns: ColumnDef<Destination>[] = [
  {
    id: 'cover',
    header: 'Cover',
    meta: { label: 'Cover' },
    cell: ({ row }) => {
      const hero = (row.original.media ?? []).find((m) => m.role === 'hero');
      return hero?.url ? (
        <img
          src={hero.url}
          alt=""
          className="bg-muted aspect-16/10 w-16 rounded-md border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground grid aspect-16/10 w-16 place-items-center rounded-md border">
          <MapPin className="size-4" aria-hidden />
        </div>
      );
    },
  },
  {
    id: 'name',
    header: 'Name',
    enableHiding: false,
    accessorFn: (row) => row.name.toLowerCase(),
    meta: { label: 'Name' },
    cell: ({ row }) => (
      <Link
        href={`/destinations/${row.original.slug}`}
        className="hover:text-primary font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    id: 'region',
    header: 'Region',
    accessorFn: (row) => row.region?.toLowerCase() ?? undefined,
    sortUndefined: 'last',
    meta: { label: 'Region' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.region ?? '—'}
      </span>
    ),
  },
  {
    id: 'country',
    header: 'Country',
    accessorFn: (row) => row.country.toLowerCase(),
    meta: { label: 'Country' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.country}</span>
    ),
  },
  {
    id: 'toursCount',
    header: 'Tours',
    accessorFn: (row) => row.toursCount ?? undefined,
    sortUndefined: 'last',
    meta: { label: 'Tours', align: 'right' },
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.toursCount ?? '—'}</span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge
        variant={row.original.isActive ? 'default' : 'secondary'}
        className="gap-1.5"
      >
        <span
          className="size-1.5 rounded-full bg-current opacity-70"
          aria-hidden
        />
        {row.original.isActive ? 'Active' : 'Draft'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    enableHiding: false,
    meta: { align: 'right' },
    cell: ({ row }) => (
      <RowActions
        editHref={`/destinations/${row.original.slug}/edit`}
        deleteAction={deleteDestination}
        deleteId={row.original.slug}
        deleteTitle={`Delete “${row.original.name}”?`}
        deleteDescription="This permanently deletes the destination and can’t be undone. You can only delete one that’s turned off (Draft) and has no tours attached."
      />
    ),
  },
];

/**
 * Client-side Destinations table on TanStack: tab + search filtering happens in memory (instant, no
 * server round-trip — the catalog is small and loaded once) and feeds the already-filtered rows into
 * the table. TanStack owns only the column model, visibility (the "Columns" button), and in-memory
 * paging; `autoResetPageIndex` returns to page 1 whenever the filtered set changes.
 */
export function DestinationsTable({ rows }: { rows: Destination[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('destinations');

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.isActive).length,
      draft: rows.filter((r) => !r.isActive).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'active' && !r.isActive) return false;
      if (tab === 'draft' && r.isActive) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, tab, query]);

  const table = useReactTable({
    data: filtered,
    columns: destinationColumns,
    state: { columnVisibility, sorting },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'draft', label: 'Draft', count: counts.draft },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabPills tabs={tabs} value={tab} onValueChange={setTab} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search by name"
              className="bg-background pl-8"
            />
          </div>
          <ColumnsMenu table={table} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>No destinations match your filters</EmptyTitle>
            <EmptyDescription>
              Try a different name or clear the filters to see them all.
            </EmptyDescription>
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

export default DestinationsTable;
