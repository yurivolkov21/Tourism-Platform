import { useCallback, useMemo, useState } from 'react';

import {
  buildActiveFilterChips,
  filterTours,
  searchTours,
  sortTours,
  type TourCardData,
  type TourSort,
} from '@tourism/core';
import { messages } from '@tourism/i18n';

import {
  EMPTY_TOURS_FILTERS,
  type FacetKey,
  type TourViewMode,
  type ToursFilterState,
} from '../../components/tours/tours-filter-types';

type UseToursListingStateOptions = {
  allTours: TourCardData[];
  query: string;
};

export function useToursListingState({
  allTours,
  query,
}: UseToursListingStateOptions) {
  const t = messages.toursPage;
  const [filters, setFilters] = useState<ToursFilterState>(EMPTY_TOURS_FILTERS);
  const [sort, setSort] = useState<TourSort>('popular');
  const [viewMode, setViewMode] = useState<TourViewMode>('vertical');
  const [listingSheetOpen, setListingSheetOpen] = useState(false);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tour of allTours) {
      if (tour.category && !seen.has(tour.category)) {
        seen.set(tour.category, tour.categoryName ?? tour.category);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [allTours]);

  const categoryLabel = useCallback(
    (slug: string) =>
      categoryOptions.find((o) => o.value === slug)?.label ?? slug,
    [categoryOptions],
  );

  const facetLabels = useMemo(
    () => ({
      duration: t.durationLabels,
      price: t.priceLabels,
      style: t.styleLabels,
      theme: t.themeLabels,
      rating: t.ratingLabels,
    }),
    [
      t.durationLabels,
      t.priceLabels,
      t.styleLabels,
      t.themeLabels,
      t.ratingLabels,
    ],
  );

  const activeChips = useMemo(
    () => buildActiveFilterChips(filters, { categoryLabel, facetLabels }),
    [filters, categoryLabel, facetLabels],
  );

  /** Sheet facets only — destination is chosen on the Destinations tab. */
  const sheetActiveChips = useMemo(
    () => activeChips.filter((chip) => chip.facet !== 'destinations'),
    [activeChips],
  );

  const activeCount = sheetActiveChips.length;
  const listingFilterCount = activeChips.length;

  const results = useMemo(
    () => sortTours(searchTours(filterTours(allTours, filters), query), sort),
    [allTours, filters, query, sort],
  );

  const resultCount = results.length;

  const sortLabels: Record<TourSort, string> = useMemo(
    () => ({
      popular: t.sortOptions.popular,
      'price-asc': t.sortOptions.priceAsc,
      'price-desc': t.sortOptions.priceDesc,
      rating: t.sortOptions.rating,
    }),
    [t.sortOptions],
  );

  const toggleFilter = useCallback((facet: FacetKey, optionValue: string) => {
    setFilters((prev) => {
      const current = prev[facet] as string[];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [facet]: next };
    });
  }, []);

  const removeChip = useCallback((facet: string, value: string) => {
    if (!(facet in EMPTY_TOURS_FILTERS)) return;
    setFilters((prev) => {
      const key = facet as FacetKey;
      const current = prev[key] as string[];
      return { ...prev, [key]: current.filter((v) => v !== value) };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_TOURS_FILTERS);
  }, []);

  const prefilterDestination = useCallback((name: string) => {
    setFilters({
      ...EMPTY_TOURS_FILTERS,
      destinations: [name],
    });
  }, []);

  return {
    filters,
    sort,
    viewMode,
    setViewMode,
    results,
    resultCount,
    activeCount,
    /** All active chips (destination first) — the listing chips row. */
    activeChips,
    listingFilterCount,
    categoryOptions,
    sortLabels,
    currentSortLabel: sortLabels[sort],
    listingSheetOpen,
    openListingSheet: () => setListingSheetOpen(true),
    closeListingSheet: () => setListingSheetOpen(false),
    toggleFilter,
    removeChip,
    clearFilters,
    prefilterDestination,
    setSort,
  };
}
