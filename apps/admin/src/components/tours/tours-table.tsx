'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronDown,
  Compass,
  ListFilter,
  Search,
} from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deleteTour } from '../../lib/tours/actions';
import type { TourSummary } from '../../lib/tours/data';
import { DataTablePagination, DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';

type Tab = 'all' | 'published' | 'draft';

function money(value: string, currency: string): string {
  const n = Number(value);
  const body = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : value;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}

function primaryDestination(tour: TourSummary): string {
  const primary = tour.destinations.find((d) => d.isPrimary) ?? tour.destinations[0];
  return primary?.destination.name ?? '—';
}

/**
 * Client-side Tours table: tab (status) + category + search filtering happens in memory (instant, no
 * server round-trip — the catalog is small and loaded once). Tabs show live counts; the category
 * options are derived from the loaded rows; pagination kicks in past {@link pageSize} rows.
 */
export function ToursTable({ rows }: { rows: TourSummary[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'published' && !r.isPublished) return false;
      if (tab === 'draft' && r.isPublished) return false;
      if (selectedCats.length && !selectedCats.includes(r.category.slug)) return false;
      if (needle) {
        const haystack = `${r.title} ${r.category.name} ${r.destinations
          .map((d) => d.destination.name)
          .join(' ')}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, tab, selectedCats, query]);

  const toggleCategory = (slug: string, checked: boolean) => {
    setSelectedCats((prev) => (checked ? [...prev, slug] : prev.filter((s) => s !== slug)));
    setPage(1);
  };

  // Trigger label: "All categories" / the single name / "N categories".
  const categoryLabel =
    selectedCats.length === 0
      ? 'All categories'
      : selectedCats.length === 1
        ? (categoryOptions.find((c) => c.slug === selectedCats[0])?.name ?? '1 category')
        : `${selectedCats.length} categories`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'published', label: 'Published', count: counts.published },
    { value: 'draft', label: 'Draft', count: counts.draft },
  ];
  const selectTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                onClick={() => selectTab(t.value)}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal sm:w-52"
                  aria-label="Filter by category"
                />
              }
            >
              <span className="inline-flex items-center gap-2">
                <ListFilter className="size-4 shrink-0" />
                <span className="truncate">{categoryLabel}</span>
              </span>
              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                {categoryOptions.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.slug}
                    checked={selectedCats.includes(c.slug)}
                    onCheckedChange={(checked) => toggleCategory(c.slug, checked === true)}
                    closeOnClick={false}
                  >
                    {c.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {selectedCats.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCats([]);
                      setPage(1);
                    }}
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, category, destination…"
              aria-label="Search tours"
              className="bg-background pl-8"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Compass />
            </EmptyMedia>
            <EmptyTitle>No tours match your filters</EmptyTitle>
            <EmptyDescription>Try different filters or clear them to see them all.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Primary destination</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Compare-at</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((tour) => (
                  <TableRow key={tour.id}>
                    <TableCell className="font-medium">
                      <Link href={`/tours/${tour.slug}`} className="hover:text-primary hover:underline">
                        {tour.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tour.category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{primaryDestination(tour)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(tour.basePrice, tour.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {tour.compareAtPrice ? (
                        <span className="line-through">{money(tour.compareAtPrice, tour.currency)}</span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{tour.durationDays}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={tour.isPublished ? 'default' : 'secondary'} className="gap-1.5">
                          <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                          {tour.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        {tour.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        editHref={`/tours/${tour.slug}/edit`}
                        deleteAction={deleteTour}
                        deleteId={tour.slug}
                        deleteTitle={`Delete “${tour.title}”?`}
                        deleteDescription="This permanently deletes the tour and can’t be undone. You can only delete one that’s unpublished (Draft) and has no bookings."
                        extraItems={[
                          {
                            label: 'Departures',
                            href: `/tours/${tour.slug}/departures`,
                            icon: CalendarRange,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            page={current}
            pageCount={totalPages}
            total={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}

export default ToursTable;
