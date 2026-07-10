import type {
  DurationBucket,
  PriceBucket,
  TourFilters,
  TourTheme,
  TravelStyle,
} from './tours-filter.js';

export type { TourFilters };

export type FilterFacetKey = keyof TourFilters;

export type ActiveFilterChip = {
  facet: FilterFacetKey;
  value: string;
  label: string;
};

export type FacetLabelMaps = {
  duration: Record<DurationBucket, string>;
  price: Record<PriceBucket, string>;
  style: Record<TravelStyle, string>;
  theme: Record<TourTheme, string>;
};

export type BuildActiveFilterChipsOptions = {
  categoryLabel: (slug: string) => string;
  facetLabels: FacetLabelMaps;
};

function facetValues<T extends string>(values: readonly T[] | undefined): T[] {
  return values?.length ? [...values] : [];
}

/** Flatten active filter selections into removable chip rows with display labels. */
export function buildActiveFilterChips(
  filters: TourFilters,
  options: BuildActiveFilterChipsOptions,
): ActiveFilterChip[] {
  const { categoryLabel, facetLabels } = options;
  const chips: ActiveFilterChip[] = [];

  for (const value of facetValues(filters.destinations)) {
    chips.push({ facet: 'destinations', value, label: value });
  }
  for (const value of facetValues(filters.categories)) {
    chips.push({ facet: 'categories', value, label: categoryLabel(value) });
  }
  for (const value of facetValues(filters.durations)) {
    chips.push({ facet: 'durations', value, label: facetLabels.duration[value] });
  }
  for (const value of facetValues(filters.styles)) {
    chips.push({ facet: 'styles', value, label: facetLabels.style[value] });
  }
  for (const value of facetValues(filters.themes)) {
    chips.push({ facet: 'themes', value, label: facetLabels.theme[value] });
  }
  for (const value of facetValues(filters.prices)) {
    chips.push({ facet: 'prices', value, label: facetLabels.price[value] });
  }

  return chips;
}
