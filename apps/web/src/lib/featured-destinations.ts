import type { DestinationTileVM } from './destinations.fixtures';

/**
 * Curated featured destinations per region for the `/destinations` overview, in
 * display order (first slug = the larger "feature" tile). Keyed by the Title-Case
 * region string from `@tourism/core` REGION_ORDER (what `groupByRegion` emits).
 * Editorial choice kept in web code — mirrors the home `HOME_BENTO` pattern.
 */
export const FEATURED_DESTINATIONS: Record<string, string[]> = {
  'Northern Vietnam': ['ha-long-bay', 'sa-pa', 'ninh-binh', 'hanoi'],
  'Central Vietnam': ['hoi-an', 'hue', 'da-nang', 'phong-nha'],
  'Southern Vietnam': [
    'phu-quoc',
    'mekong-delta',
    'ho-chi-minh-city',
    'mui-ne',
  ],
};

/** How many tiles `RegionGroup` is designed to show (1 feature + 3 photo). */
export const FEATURED_COUNT = 4;

/**
 * Pick a region's featured tiles: the curated slugs (in curated order) that exist
 * in `items`, padded from the remaining items to keep the row at `limit` when a
 * curated slug is missing. Deterministic and immutable. An unknown region (no
 * curated list) falls back to the first `limit` items in input order.
 */
export function pickFeaturedDestinations(
  items: readonly DestinationTileVM[],
  region: string,
  limit = FEATURED_COUNT,
): DestinationTileVM[] {
  const bySlug = new Map(items.map((t) => [t.slug, t]));
  const curated = FEATURED_DESTINATIONS[region] ?? [];
  const picked: DestinationTileVM[] = [];
  const used = new Set<string>();

  for (const slug of curated) {
    const tile = bySlug.get(slug);
    if (tile && !used.has(slug)) {
      picked.push(tile);
      used.add(slug);
      if (picked.length >= limit) return picked;
    }
  }

  for (const tile of items) {
    if (used.has(tile.slug)) continue;
    picked.push(tile);
    used.add(tile.slug);
    if (picked.length >= limit) break;
  }

  return picked;
}
