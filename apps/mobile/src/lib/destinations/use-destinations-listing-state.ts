import { useCallback, useMemo, useState } from 'react';

import {
  DESTINATION_OTHER_REGION,
  filterDestinations,
  REGION_ORDER,
  searchDestinations,
  sortDestinations,
  type DestinationCardData,
  type DestinationSort,
} from '@tourism/core';
import { messages } from '@tourism/i18n';

import {
  DESTINATION_REGION_OPTIONS,
  EMPTY_DESTINATIONS_FILTERS,
  type DestinationViewMode,
  type DestinationsFilterState,
} from './destination-filter-types';

type UseDestinationsListingStateOptions = {
  allDestinations: DestinationCardData[];
  query: string;
};

export function useDestinationsListingState({
  allDestinations,
  query,
}: UseDestinationsListingStateOptions) {
  const t = messages.mobile.destinations;
  const [filters, setFilters] = useState<DestinationsFilterState>(EMPTY_DESTINATIONS_FILTERS);
  const [sort, setSort] = useState<DestinationSort>('tours-desc');
  const [viewMode, setViewMode] = useState<DestinationViewMode>('vertical');
  const [listingSheetOpen, setListingSheetOpen] = useState(false);

  const regionLabel = useCallback(
    (region: string) => {
      if (region === DESTINATION_OTHER_REGION) return t.regionLabels.other;
      const short = t.regionLabels.short as Record<string, string>;
      return short[region] ?? region;
    },
    [t.regionLabels],
  );

  const regionOptions = useMemo(() => {
    const present = new Set(
      allDestinations.map((d) =>
        d.region && REGION_ORDER.includes(d.region) ? d.region : DESTINATION_OTHER_REGION,
      ),
    );
    return DESTINATION_REGION_OPTIONS.filter((region) => present.has(region)).map((value) => ({
      value,
      label: regionLabel(value),
    }));
  }, [allDestinations, regionLabel]);

  const activeChips = useMemo(
    () =>
      filters.regions.map((value) => ({
        facet: 'regions' as const,
        value,
        label: regionLabel(value),
      })),
    [filters.regions, regionLabel],
  );

  const activeCount = activeChips.length;

  const results = useMemo(
    () =>
      sortDestinations(
        searchDestinations(filterDestinations(allDestinations, filters), query),
        sort,
      ),
    [allDestinations, filters, query, sort],
  );

  const resultCount = results.length;

  const sortLabels: Record<DestinationSort, string> = useMemo(
    () => ({
      'tours-desc': t.sortOptions.toursDesc,
      'name-asc': t.sortOptions.nameAsc,
      'name-desc': t.sortOptions.nameDesc,
    }),
    [t.sortOptions],
  );

  const toggleFilter = useCallback((facet: 'regions', optionValue: string) => {
    setFilters((prev) => {
      const current = prev[facet];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [facet]: next };
    });
  }, []);

  const removeChip = useCallback((facet: string, value: string) => {
    if (facet !== 'regions') return;
    setFilters((prev) => ({
      ...prev,
      regions: prev.regions.filter((v) => v !== value),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_DESTINATIONS_FILTERS);
  }, []);

  const displayRegion = useCallback(
    (region: string | null) => {
      const bucket =
        region && REGION_ORDER.includes(region) ? region : DESTINATION_OTHER_REGION;
      return regionLabel(bucket);
    },
    [regionLabel],
  );

  return {
    filters,
    sort,
    viewMode,
    results,
    resultCount,
    activeCount,
    activeChips,
    regionOptions,
    sortLabels,
    currentSortLabel: sortLabels[sort],
    listingSheetOpen,
    openListingSheet: () => setListingSheetOpen(true),
    closeListingSheet: () => setListingSheetOpen(false),
    toggleFilter,
    removeChip,
    clearFilters,
    setSort,
    setViewMode,
    displayRegion,
  };
}
