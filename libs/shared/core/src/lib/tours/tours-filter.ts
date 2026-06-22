/**
 * Tours catalogue taxonomy + pure filtering/sorting. Authored here (data-access) so the web app and a
 * future API share one taxonomy; the UI imports these types and calls the pure helpers. No I/O, no deps.
 */

/** How a traveller travels. */
export type TravelStyle = 'family' | 'couples' | 'adventure' | 'luxury' | 'group' | 'private';
/** What a tour is about. */
export type TourTheme = 'cruise' | 'trekking' | 'cultural' | 'culinary' | 'beach' | 'nature';
/** Duration facet buckets. */
export type DurationBucket = '1' | '2-3' | '4+';
/** Result ordering. */
export type TourSort = 'popular' | 'price-asc' | 'price-desc' | 'rating';

/** Minimal tour shape the filters operate on (the web `TourCardData` is structurally compatible). */
export interface FilterableTour {
  destination: string;
  durationDays: number;
  basePrice: number;
  rating: number;
  reviewCount: number;
  travelStyles?: TravelStyle[];
  themes?: TourTheme[];
}

/** Selected facet values. An empty/absent facet imposes no constraint. */
export interface TourFilters {
  destinations?: string[];
  durations?: DurationBucket[];
  styles?: TravelStyle[];
  themes?: TourTheme[];
}

/** Map a day count to its duration bucket (`1` / `2-3` / `4+`). */
export function durationBucket(days: number): DurationBucket {
  if (days <= 1) return '1';
  if (days <= 3) return '2-3';
  return '4+';
}

/**
 * Filter tours: **within a facet = OR** (any selected value matches), **across facets = AND**.
 * An empty/absent facet imposes no constraint. Input order is preserved; input is not mutated.
 */
export function filterTours<T extends FilterableTour>(
  tours: readonly T[],
  filters: TourFilters = {},
): T[] {
  const { destinations, durations, styles, themes } = filters;
  return tours.filter((tour) => {
    if (destinations && destinations.length > 0 && !destinations.includes(tour.destination)) {
      return false;
    }
    if (
      durations &&
      durations.length > 0 &&
      !durations.includes(durationBucket(tour.durationDays))
    ) {
      return false;
    }
    if (
      styles &&
      styles.length > 0 &&
      !(tour.travelStyles ?? []).some((style) => styles.includes(style))
    ) {
      return false;
    }
    if (themes && themes.length > 0 && !(tour.themes ?? []).some((theme) => themes.includes(theme))) {
      return false;
    }
    return true;
  });
}

/** Return a sorted copy of the tours (does not mutate the input). */
export function sortTours<T extends FilterableTour>(tours: readonly T[], sort: TourSort): T[] {
  const copy = [...tours];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.basePrice - b.basePrice);
    case 'price-desc':
      return copy.sort((a, b) => b.basePrice - a.basePrice);
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'popular':
    default:
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
  }
}
