/** Listing shape the Destinations API will eventually return (web extends it with editorial fields). */
export interface DestinationSummary {
  slug: string;
  name: string;
  country: string;
  region: string | null;
  description: string | null;
  tourCount: number;
}

/** Canonical region buckets, north → south. */
export const REGION_ORDER: readonly string[] = [
  'Northern Vietnam',
  'Central Vietnam',
  'Southern Vietnam',
];

/** Label for items whose region is null or not in `order`. */
const OTHER_REGION = 'Other';

/**
 * Group items by `region`, ordered by `order` (default {@link REGION_ORDER}).
 * Unknown/null regions collapse into a trailing "Other" group. Input order is
 * preserved within each group. Empty input → empty array.
 */
export function groupByRegion<T extends { region: string | null }>(
  items: readonly T[],
  order: readonly string[] = REGION_ORDER,
): { region: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = item.region && order.includes(item.region) ? item.region : OTHER_REGION;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  const ordered = [...order, OTHER_REGION];
  return ordered
    .filter((region) => buckets.has(region))
    .map((region) => ({ region, items: buckets.get(region) as T[] }));
}

/** Find the first item whose `slug` matches. */
export function getBySlug<T extends { slug: string }>(
  items: readonly T[],
  slug: string,
): T | undefined {
  return items.find((item) => item.slug === slug);
}
