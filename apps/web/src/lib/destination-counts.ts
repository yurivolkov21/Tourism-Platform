import type { DestinationTileVM } from './destinations.fixtures';

/** Minimal shape needed to tally: a tour with its M:N destination links. */
export interface TourWithDestinations {
  destinations: { destination: { slug: string } }[];
}

/**
 * Count published tours per destination slug from the tours list. A tour counts
 * for every destination it visits (M:N), so a multi-stop package adds to each of
 * its destinations. Returns a slug → count map.
 */
export function tallyToursByDestination(
  tours: readonly TourWithDestinations[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tour of tours) {
    for (const link of tour.destinations) {
      const slug = link.destination.slug;
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
  }
  return counts;
}

/** Apply tallied counts onto destination tiles (immutably); missing slug → 0. */
export function applyTourCounts(
  tiles: readonly DestinationTileVM[],
  counts: Record<string, number>,
): DestinationTileVM[] {
  return tiles.map((tile) => ({ ...tile, tourCount: counts[tile.slug] ?? 0 }));
}
