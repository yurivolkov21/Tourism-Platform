import type { TourSummary } from './data';

/**
 * In-memory filter model for the Tours list — the catalog is small and loaded
 * once, so every facet composes with AND client-side (instant, no round-trip).
 * Extracted from `ToursTable` so the predicate is unit-testable.
 */
export interface TourRowFilters {
  /** Publish-status tab. */
  tab: 'all' | 'published' | 'draft';
  /** Category slugs — any-of (empty = all). */
  categories: string[];
  /** Destination slugs — any-of; a tour counts for every destination it has (M:N). */
  destinations: string[];
  /** Only `isFeatured` tours when true. */
  featuredOnly: boolean;
  /** Free text over title + category name + destination names (case-insensitive). */
  query: string;
}

export function filterTourRows(
  rows: TourSummary[],
  filters: TourRowFilters,
): TourSummary[] {
  const needle = filters.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.tab === 'published' && !r.isPublished) return false;
    if (filters.tab === 'draft' && r.isPublished) return false;
    if (
      filters.categories.length &&
      !filters.categories.includes(r.category.slug)
    ) {
      return false;
    }
    if (
      filters.destinations.length &&
      !r.destinations.some((d) =>
        filters.destinations.includes(d.destination.slug),
      )
    ) {
      return false;
    }
    if (filters.featuredOnly && !r.isFeatured) return false;
    if (needle) {
      const haystack = `${r.title} ${r.category.name} ${r.destinations
        .map((d) => d.destination.name)
        .join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
