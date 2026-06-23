'use client';

import { useMemo, useState } from 'react';
import { SlidersHorizontalIcon, SearchXIcon, XIcon } from 'lucide-react';

import { filterTours, sortTours, type TourSort } from '@tourism/core';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { TourCardData } from './tour-card';
import { TourListCard } from './tour-list-card';
import { ToursFilters, type FacetKey, type ToursFilterState } from './tours-filters';

const EMPTY: ToursFilterState = {
  destinations: [],
  durations: [],
  styles: [],
  themes: [],
  prices: [],
};

const SORT_KEYS: TourSort[] = ['popular', 'price-asc', 'price-desc', 'rating'];

/** Tours catalogue — desktop sidebar + mobile drawer facets, sort, and a responsive `TourCard` grid.
 * Owns the filter/sort state; filtering runs client-side over the full set so the page stays static. */
export function ToursListing({ tours }: { tours: TourCardData[] }) {
  const t = messages.toursPage;
  const [filters, setFilters] = useState<ToursFilterState>(EMPTY);
  const [sort, setSort] = useState<TourSort>('popular');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const destinationOptions = useMemo(
    () => Array.from(new Set(tours.map((tour) => tour.destination))),
    [tours],
  );
  const activeCount =
    filters.destinations.length +
    filters.durations.length +
    filters.styles.length +
    filters.themes.length +
    filters.prices.length;

  const results = useMemo(
    () => sortTours(filterTours(tours, filters), sort),
    [tours, filters, sort],
  );

  // Active selections flattened into removable chips (label resolved per facet).
  const activeChips: { facet: FacetKey; value: string; label: string }[] = [
    ...filters.destinations.map((v) => ({ facet: 'destinations' as const, value: v, label: v })),
    ...filters.durations.map((v) => ({ facet: 'durations' as const, value: v, label: t.durationLabels[v] })),
    ...filters.styles.map((v) => ({ facet: 'styles' as const, value: v, label: t.styleLabels[v] })),
    ...filters.themes.map((v) => ({ facet: 'themes' as const, value: v, label: t.themeLabels[v] })),
    ...filters.prices.map((v) => ({ facet: 'prices' as const, value: v, label: t.priceLabels[v] })),
  ];

  const toggle = (facet: FacetKey, optionValue: string) =>
    setFilters((prev) => {
      const current = prev[facet] as string[];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [facet]: next };
    });

  const clearAll = () => setFilters(EMPTY);

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
      activeCount={activeCount}
    />
  );

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-24">{filtersNode}</div>
          </aside>

          {/* Results */}
          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
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
                <p className="text-muted-foreground text-sm">{t.resultCount(results.length)}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground hidden text-sm sm:inline">{t.sortLabel}</span>
                <Select value={sort} onValueChange={(value) => setSort(value as TourSort)}>
                  <SelectTrigger className="w-44">
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
                    onClick={() => toggle(chip.facet, chip.value)}
                    className="border-border bg-muted text-foreground/80 hover:text-foreground hover:border-foreground/30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors"
                  >
                    {chip.label}
                    <XIcon className="size-3.5" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-primary ml-1 text-sm font-medium hover:underline"
                >
                  {t.clearAll}
                </button>
              </div>
            ) : null}

            {results.length > 0 ? (
              <div className="flex flex-col gap-5">
                {results.map((tour) => (
                  <TourListCard key={tour.slug} tour={tour} />
                ))}
              </div>
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

export default ToursListing;
