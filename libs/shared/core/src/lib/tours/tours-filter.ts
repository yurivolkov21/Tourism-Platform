/**
 * Tours catalogue taxonomy + pure filtering/sorting. Authored here (data-access) so the web app and a
 * future API share one taxonomy; the UI imports these types and calls the pure helpers. No I/O, no deps.
 */

/** How a traveller travels. */
export type TravelStyle =
  | 'family'
  | 'couples'
  | 'adventure'
  | 'luxury'
  | 'group'
  | 'private';
/** What a tour is about. */
export type TourTheme =
  | 'cruise'
  | 'trekking'
  | 'cultural'
  | 'culinary'
  | 'beach'
  | 'nature';
/** Duration facet buckets. */
export type DurationBucket = '1' | '2-3' | '4+';
/** Price facet buckets (USD per person). */
export type PriceBucket = '<100' | '100-300' | '300+';
/** Minimum-rating facet buckets ("4+" keeps tours rated 4.0 or higher). */
export type RatingBucket = '4.5+' | '4+' | '3.5+';
/** Result ordering. */
export type TourSort = 'popular' | 'price-asc' | 'price-desc' | 'rating';

/** Lowest rating a tour needs to fall inside each bucket. */
export const RATING_BUCKET_MINIMUM: Record<RatingBucket, number> = {
  '4.5+': 4.5,
  '4+': 4,
  '3.5+': 3.5,
};

/** Minimal tour shape the filters operate on (the web `TourCardData` is structurally compatible). */
export interface FilterableTour {
  destination: string;
  /**
   * Optional list of all linked destination names (M:N).
   * When present, destination filtering matches against this list so
   * a tour shows up for any destination it belongs to — not only its primary.
   */
  destinations?: string[];
  durationDays: number;
  basePrice: number;
  rating: number;
  reviewCount: number;
  /** Category slug (admin-managed taxonomy) — the facet value the navbar used to link to. */
  category?: string;
  travelStyles?: TravelStyle[];
  themes?: TourTheme[];
}

/** Selected facet values. An empty/absent facet imposes no constraint. */
export interface TourFilters {
  destinations?: string[];
  categories?: string[];
  durations?: DurationBucket[];
  styles?: TravelStyle[];
  themes?: TourTheme[];
  prices?: PriceBucket[];
  ratings?: RatingBucket[];
}

/** Map a day count to its duration bucket (`1` / `2-3` / `4+`). */
export function durationBucket(days: number): DurationBucket {
  if (days <= 1) return '1';
  if (days <= 3) return '2-3';
  return '4+';
}

/** Map a per-person price to its bucket (`<100` / `100-300` / `300+`). */
export function priceBucket(price: number): PriceBucket {
  if (price < 100) return '<100';
  if (price <= 300) return '100-300';
  return '300+';
}

/**
 * Filter tours: **within a facet = OR** (any selected value matches), **across facets = AND**.
 * An empty/absent facet imposes no constraint. Input order is preserved; input is not mutated.
 */
export function filterTours<T extends FilterableTour>(
  tours: readonly T[],
  filters: TourFilters = {},
): T[] {
  const {
    destinations,
    categories,
    durations,
    styles,
    themes,
    prices,
    ratings,
  } = filters;
  const normalizedDestinations =
    destinations && destinations.length > 0
      ? new Set(destinations.map((d) => normalizeText(d)))
      : null;
  return tours.filter((tour) => {
    if (normalizedDestinations) {
      const pool = tour.destinations?.length
        ? tour.destinations
        : [tour.destination];
      const matches = pool.some((value) =>
        normalizedDestinations.has(normalizeText(value)),
      );
      if (!matches) return false;
    }
    if (
      categories &&
      categories.length > 0 &&
      !(tour.category != null && categories.includes(tour.category))
    ) {
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
      prices &&
      prices.length > 0 &&
      !prices.includes(priceBucket(tour.basePrice))
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
    if (
      themes &&
      themes.length > 0 &&
      !(tour.themes ?? []).some((theme) => themes.includes(theme))
    ) {
      return false;
    }
    if (
      ratings &&
      ratings.length > 0 &&
      !ratings.some((bucket) => tour.rating >= RATING_BUCKET_MINIMUM[bucket])
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Lowercase, trim and strip diacritics so free-text matching is accent- and case-insensitive
 * (e.g. "ha noi" matches "Hà Nội"). The Vietnamese đ/Đ has no NFD decomposition, so it is folded
 * to `d` explicitly.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/** Free-text searchable shape. The web `TourCardData` is structurally compatible. */
export interface SearchableTour {
  title: string;
  destination: string;
  /** Human-readable category name (not the slug), when present. */
  categoryName?: string;
}

/**
 * Free-text search over a tour's title, destination and category name — accent- and
 * case-insensitive (see {@link normalizeText}). An empty/whitespace query returns a copy of all
 * tours. Input order is preserved; input is not mutated.
 */
export function searchTours<T extends SearchableTour>(
  tours: readonly T[],
  query: string,
): T[] {
  const q = normalizeText(query);
  if (q === '') return [...tours];
  return tours.filter((tour) =>
    normalizeText(
      `${tour.title} ${tour.destination} ${tour.categoryName ?? ''}`,
    ).includes(q),
  );
}

/** Return a sorted copy of the tours (does not mutate the input). */
export function sortTours<T extends FilterableTour>(
  tours: readonly T[],
  sort: TourSort,
): T[] {
  const copy = [...tours];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.basePrice - b.basePrice);
    case 'price-desc':
      return copy.sort((a, b) => b.basePrice - a.basePrice);
    case 'rating':
      return copy.sort(
        (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      );
    case 'popular':
    default:
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
  }
}
