'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  SlidersHorizontalIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ChevronFirstIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronLastIcon,
} from 'lucide-react';

import { buildActiveFilterChips, filterTours, searchTours, sortTours, type TourSort } from '@tourism/core';
import {
  Button,
  Input,
  Label,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { TourCardData } from './tour-card';
import { TourListCard } from './tour-list-card';
import { ToursFilters, type FacetKey, type ToursFilterState } from './tours-filters';
import { pageNumbers, pageView, type PageView } from '../../lib/paginate';

const PAGE_SIZES = [10, 15, 25] as const;
const DEFAULT_PAGE_SIZE = 10;

const EMPTY: ToursFilterState = {
  destinations: [],
  categories: [],
  durations: [],
  styles: [],
  themes: [],
  prices: [],
};

const SORT_KEYS: TourSort[] = ['popular', 'price-asc', 'price-desc', 'rating'];

/** Tours catalogue — desktop sidebar + mobile drawer facets, sort, and a responsive `TourCard` grid.
 * Owns the filter/sort state; filtering runs client-side over the full set so the page stays static. */
export function ToursListing({
  tours,
  initialCategory = null,
  initialQuery = '',
}: {
  tours: TourCardData[];
  initialCategory?: string | null;
  /** Seed free-text search (e.g. from the home hero's `?q=`). Kept as local state thereafter. */
  initialQuery?: string;
}) {
  const t = messages.toursPage;
  const [filters, setFilters] = useState<ToursFilterState>(() =>
    initialCategory ? { ...EMPTY, categories: [initialCategory] } : EMPTY,
  );
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<TourSort>('popular');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const destinationOptions = useMemo(
    () => Array.from(new Set(tours.map((tour) => tour.destination))),
    [tours],
  );
  // Category facet options (slug → name), de-duped, only for tours that carry a category.
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tour of tours) {
      if (tour.category && !seen.has(tour.category)) {
        seen.set(tour.category, tour.categoryName ?? tour.category);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [tours]);
  const categoryLabel = (slug: string) =>
    categoryOptions.find((o) => o.value === slug)?.label ?? slug;

  const activeCount =
    filters.destinations.length +
    filters.categories.length +
    filters.durations.length +
    filters.styles.length +
    filters.themes.length +
    filters.prices.length;

  const results = useMemo(
    () => sortTours(searchTours(filterTours(tours, filters), query), sort),
    [tours, filters, query, sort],
  );

  // Reset to the first page whenever the result set or page size changes (so we never strand the
  // user on a now-empty page after filtering).
  useEffect(() => {
    setPage(1);
  }, [filters, query, sort, pageSize]);

  const view = pageView(results.length, page, pageSize);
  const visible = results.slice((view.page - 1) * pageSize, view.page * pageSize);

  const activeChips = useMemo(
    () =>
      buildActiveFilterChips(filters, {
        categoryLabel,
        facetLabels: {
          duration: t.durationLabels,
          price: t.priceLabels,
          style: t.styleLabels,
          theme: t.themeLabels,
        },
      }),
    [filters, categoryLabel, t.durationLabels, t.priceLabels, t.styleLabels, t.themeLabels],
  );

  const toggle = (facet: FacetKey, optionValue: string) =>
    setFilters((prev) => {
      const current = prev[facet] as string[];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [facet]: next };
    });

  const clearAll = () => {
    setFilters(EMPTY);
    setQuery('');
  };

  const sortLabel: Record<TourSort, string> = {
    popular: t.sortOptions.popular,
    'price-asc': t.sortOptions.priceAsc,
    'price-desc': t.sortOptions.priceDesc,
    rating: t.sortOptions.rating,
  };

  const filtersNode = (
    <ToursFilters
      value={filters}
      onToggle={toggle}
      onClearAll={clearAll}
      destinationOptions={destinationOptions}
      categoryOptions={categoryOptions}
      activeCount={activeCount}
    />
  );

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'lg:grid lg:gap-12',
            sidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-[16rem_1fr]',
          )}
        >
          {/* Sidebar (desktop, collapsible) */}
          <aside className={cn(sidebarCollapsed ? 'hidden' : 'hidden lg:block')}>
            <div className="lg:sticky lg:top-24">{filtersNode}</div>
          </aside>

          {/* Results */}
          <div className="min-w-0">
            {/* Free-text search — seeded from the home hero's `?q=`, then filters live as you type. */}
            <div className="relative mb-6">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchAriaLabel}
                className="bg-background h-11 rounded-full pr-4 pl-10"
              />
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Mobile: open drawer */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                >
                  <SlidersHorizontalIcon className="size-4" />
                  {t.filtersLabel}
                  {activeCount > 0 ? (
                    <span className="bg-primary text-primary-foreground ml-1 inline-flex size-5 items-center justify-center rounded-full text-xs">
                      {activeCount}
                    </span>
                  ) : null}
                </Button>
                {/* Desktop: collapse / expand the inline sidebar */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden lg:inline-flex"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  aria-expanded={!sidebarCollapsed}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpenIcon className="size-4" />
                  ) : (
                    <PanelLeftCloseIcon className="size-4" />
                  )}
                  {sidebarCollapsed ? t.showFilters : t.hideFilters}
                  {sidebarCollapsed && activeCount > 0 ? (
                    <span className="bg-primary text-primary-foreground ml-1 inline-flex size-5 items-center justify-center rounded-full text-xs">
                      {activeCount}
                    </span>
                  ) : null}
                </Button>
                <p className="text-muted-foreground text-sm">{t.resultCount(results.length)}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground hidden text-sm sm:inline">{t.sortLabel}</span>
                <Select value={sort} onValueChange={(value) => setSort(value as TourSort)}>
                  <SelectTrigger className="w-44" aria-label={t.sortLabel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {sortLabel[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeChips.length > 0 ? (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={`${chip.facet}-${chip.value}`}
                    type="button"
                    aria-label={`${messages.a11y.removeFilter}: ${chip.label}`}
                    onClick={() => toggle(chip.facet, chip.value)}
                    className="border-border bg-muted text-foreground/80 hover:text-foreground hover:border-foreground/30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors"
                  >
                    <span aria-hidden="true">{chip.label}</span>
                    <XIcon className="size-3.5" aria-hidden="true" />
                  </button>
                ))}
                <Button variant="link" onClick={clearAll} className="ml-1 h-auto p-0">
                  {t.clearAll}
                </Button>
              </div>
            ) : null}

            {results.length > 0 ? (
              <>
                <div className="flex flex-col gap-5">
                  {visible.map((tour) => (
                    <TourListCard key={tour.slug} tour={tour} />
                  ))}
                </div>
                <PaginationBar
                  view={view}
                  total={results.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            ) : (
              <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-20 text-center">
                <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
                  <SearchXIcon className="size-7" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-sans text-lg font-semibold">{t.empty.title}</h3>
                  <p className="text-muted-foreground text-pretty">{t.empty.body}</p>
                </div>
                <Button variant="outline" onClick={clearAll}>
                  {t.empty.cta}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 max-w-[85vw] overflow-y-auto p-6">
          <SheetHeader className="sr-only">
            <SheetTitle>{t.filtersLabel}</SheetTitle>
          </SheetHeader>
          {filtersNode}
        </SheetContent>
      </Sheet>
    </section>
  );
}

/** Result-set pager: rows-per-page select · "Showing X–Y of Z" · first/prev/pages/next/last.
 * Client-side (the list is already filtered in memory), so links update local state. */
function PaginationBar({
  view,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  view: PageView;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const t = messages.toursPage;
  const { page, totalPages, start, end } = view;
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  const go = (target: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    if (target >= 1 && target <= totalPages && target !== page) onPageChange(target);
  };
  const edge = 'rounded-full';
  const disabled = 'pointer-events-none opacity-40';
  // Keep CSS-disabled edge links out of the tab order and announce them as disabled to AT.
  const edgeProps = (off: boolean) => ({
    'aria-disabled': off || undefined,
    tabIndex: off ? -1 : undefined,
  });

  return (
    <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-4 max-sm:justify-center">
      <div className="flex shrink-0 items-center gap-2.5">
        <Label htmlFor="tours-page-size" className="text-muted-foreground text-sm">
          {t.perPage}
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
          items={PAGE_SIZES.map((s) => ({ value: String(s), label: String(s) }))}
        >
          <SelectTrigger id="tours-page-size" className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground text-sm whitespace-nowrap" aria-live="polite">
        {t.showing(start, end, total)}
      </p>

      {totalPages > 1 ? (
        <Pagination className="w-fit max-sm:mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Go to first page"
                size="icon"
                className={cn(edge, isFirst && disabled)}
                onClick={go(1)}
                {...edgeProps(isFirst)}
              >
                <ChevronFirstIcon className="size-4" aria-hidden="true" />
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Go to previous page"
                size="icon"
                className={cn(edge, isFirst && disabled)}
                onClick={go(page - 1)}
                {...edgeProps(isFirst)}
              >
                <ChevronLeftIcon className="size-4" aria-hidden="true" />
              </PaginationLink>
            </PaginationItem>

            {pageNumbers(totalPages, page).map((p, i) =>
              p === 'ellipsis' ? (
                <PaginationItem key={`e-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    className={edge}
                    onClick={go(p)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Go to next page"
                size="icon"
                className={cn(edge, isLast && disabled)}
                onClick={go(page + 1)}
                {...edgeProps(isLast)}
              >
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Go to last page"
                size="icon"
                className={cn(edge, isLast && disabled)}
                onClick={go(totalPages)}
                {...edgeProps(isLast)}
              >
                <ChevronLastIcon className="size-4" aria-hidden="true" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

export default ToursListing;
