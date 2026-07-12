'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarRange, Compass, ListFilter, Search, Star } from 'lucide-react';
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
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  cn,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deleteTour } from '../../lib/tours/actions';
import type { TourSummary } from '../../lib/tours/data';
import { filterTourRows } from '../../lib/tours/filter';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import { ColumnsMenu } from '../crud/columns-menu';
import { FacetFilter } from '../crud/facet-filter';
import { usePersistentColumnVisibility } from '../crud/use-persistent-column-visibility';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';
import { TabPills } from '../crud/tab-pills';

type Tab = 'all' | 'published' | 'draft';

function money(value: string, currency: string): string {
  const n = Number(value);
  const body = Number.isFinite(n)
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : value;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}

function primaryDestination(tour: TourSummary): string {
  const primary =
    tour.destinations.find((d) => d.isPrimary) ?? tour.destinations[0];
  return primary?.destination.name ?? '—';
}

const tourColumns: ColumnDef<TourSummary>[] = [
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
          <Compass className="size-4" aria-hidden />
        </div>
      );
    },
  },
  {
    id: 'title',
    header: 'Title',
    enableHiding: false,
    accessorFn: (row) => row.title.toLowerCase(),
    meta: { label: 'Title' },
    cell: ({ row }) => (
      <Link
        href={`/tours/${row.original.slug}`}
        title={row.original.title}
        className="hover:text-primary block max-w-104 truncate font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: 'category',
    header: 'Category',
    accessorFn: (row) => row.category.name.toLowerCase(),
    meta: { label: 'Category' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.category.name}
      </span>
    ),
  },
  {
    id: 'primaryDestination',
    header: 'Primary destination',
    meta: { label: 'Primary destination' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {primaryDestination(row.original)}
      </span>
    ),
  },
  {
    id: 'price',
    header: 'Price',
    accessorFn: (row) => Number(row.basePrice),
    meta: { label: 'Price', align: 'right' },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {money(row.original.basePrice, row.original.currency)}
      </span>
    ),
  },
  {
    id: 'compareAt',
    header: 'Compare-at',
    meta: { label: 'Compare-at', align: 'right' },
    cell: ({ row }) =>
      row.original.compareAtPrice ? (
        <span className="text-muted-foreground tabular-nums line-through">
          {money(row.original.compareAtPrice, row.original.currency)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'days',
    header: 'Days',
    accessorFn: (row) => row.durationDays,
    meta: { label: 'Days', align: 'right' },
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.durationDays}</span>
    ),
  },
  {
    id: 'rating',
    header: 'Rating',
    accessorFn: (row) => row.averageRating,
    meta: { label: 'Rating' },
    cell: ({ row }) =>
      row.original.reviewsCount === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <Star className="size-3 fill-current text-amber-500" aria-hidden />
          <span className="tabular-nums">
            {row.original.averageRating.toFixed(1)}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            ({row.original.reviewsCount})
          </span>
        </span>
      ),
  },
  {
    id: 'nextDeparture',
    header: 'Next departure',
    accessorFn: (row) =>
      row.nextDepartureDate
        ? new Date(row.nextDepartureDate).getTime()
        : undefined,
    sortUndefined: 'last',
    meta: { label: 'Next departure' },
    cell: ({ row }) => {
      const d = row.original.nextDepartureDate;
      if (!d) return <span className="text-muted-foreground">—</span>;
      const seats = row.original.nextDepartureSeatsLeft;
      return (
        <span className="whitespace-nowrap tabular-nums">
          {new Date(d).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
          {seats !== null && seats !== undefined ? (
            <span className="text-muted-foreground block text-xs">
              {seats} seats left
            </span>
          ) : null}
        </span>
      );
    },
  },
  {
    id: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1">
        <Badge
          variant={row.original.isPublished ? 'default' : 'secondary'}
          className="gap-1.5"
        >
          <span
            className="size-1.5 rounded-full bg-current opacity-70"
            aria-hidden
          />
          {row.original.isPublished ? 'Published' : 'Draft'}
        </Badge>
        {row.original.isFeatured ? (
          <Badge variant="outline">Featured</Badge>
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
        editHref={`/tours/${row.original.slug}/edit`}
        deleteAction={deleteTour}
        deleteId={row.original.slug}
        deleteTitle={`Delete “${row.original.title}”?`}
        deleteDescription="This permanently deletes the tour and can’t be undone. You can only delete one that’s unpublished (Draft) and has no bookings."
        extraItems={[
          {
            label: 'Departures',
            href: `/tours/${row.original.slug}/departures`,
            icon: CalendarRange,
          },
        ]}
      />
    ),
  },
];

/**
 * Client-side Tours table on TanStack: tab (status) + category + search filtering happens in memory
 * (instant, no server round-trip — the catalog is small and loaded once) and feeds the already-filtered
 * rows into the table. TanStack owns only the column model, visibility (the "Columns" button), and
 * in-memory paging; `autoResetPageIndex` returns to page 1 whenever the filtered set changes.
 */
export function ToursTable({ rows }: { rows: TourSummary[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedDests, setSelectedDests] = useState<string[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    usePersistentColumnVisibility('tours');

  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((r) => r.isPublished).length,
      draft: rows.filter((r) => !r.isPublished).length,
    }),
    [rows],
  );

  // Unique category options from the loaded rows (slug → name), alphabetical.
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.category.slug, r.category.name);
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Unique destination options across every tour's M:N links, alphabetical.
  const destinationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows)
      for (const d of r.destinations)
        map.set(d.destination.slug, d.destination.name);
    return [...map.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(
    () =>
      filterTourRows(rows, {
        tab,
        categories: selectedCats,
        destinations: selectedDests,
        featuredOnly,
        query,
      }),
    [rows, tab, selectedCats, selectedDests, featuredOnly, query],
  );

  const table = useReactTable({
    data: filtered,
    columns: tourColumns,
    state: { columnVisibility, sorting },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const toggleCategory = (slug: string, checked: boolean) => {
    setSelectedCats((prev) =>
      checked ? [...prev, slug] : prev.filter((s) => s !== slug),
    );
  };

  const toggleDestination = (slug: string, checked: boolean) => {
    setSelectedDests((prev) =>
      checked ? [...prev, slug] : prev.filter((s) => s !== slug),
    );
  };

  // Trigger label: "All categories" / the single name / "N categories".
  const categoryLabel =
    selectedCats.length === 0
      ? 'All categories'
      : selectedCats.length === 1
        ? (categoryOptions.find((c) => c.slug === selectedCats[0])?.name ??
          '1 category')
        : `${selectedCats.length} categories`;

  const destinationLabel =
    selectedDests.length === 0
      ? 'All destinations'
      : selectedDests.length === 1
        ? (destinationOptions.find((d) => d.slug === selectedDests[0])?.name ??
          '1 destination')
        : `${selectedDests.length} destinations`;

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'published', label: 'Published', count: counts.published },
    { value: 'draft', label: 'Draft', count: counts.draft },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabPills tabs={tabs} value={tab} onValueChange={setTab} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FacetFilter
            label="Filter by category"
            icon={ListFilter}
            triggerLabel={categoryLabel}
            options={categoryOptions.map((c) => ({
              value: c.slug,
              label: c.name,
            }))}
            selected={selectedCats}
            multiple
            onToggle={toggleCategory}
            onClear={() => setSelectedCats([])}
          />
          <FacetFilter
            label="Filter by destination"
            icon={Compass}
            triggerLabel={destinationLabel}
            options={destinationOptions.map((d) => ({
              value: d.slug,
              label: d.name,
            }))}
            selected={selectedDests}
            multiple
            onToggle={toggleDestination}
            onClear={() => setSelectedDests([])}
          />
          <Button
            type="button"
            variant={featuredOnly ? 'default' : 'outline'}
            aria-pressed={featuredOnly}
            onClick={() => setFeaturedOnly((v) => !v)}
            className={cn(!featuredOnly && 'font-normal')}
          >
            <Star
              className={cn('size-4', featuredOnly && 'fill-current')}
              aria-hidden
            />
            Featured
          </Button>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, category, destination…"
              aria-label="Search tours"
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
              <Compass />
            </EmptyMedia>
            <EmptyTitle>No tours match your filters</EmptyTitle>
            <EmptyDescription>
              Try different filters or clear them to see them all.
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

export default ToursTable;
