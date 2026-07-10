import type { TourCardData } from '@tourism/core';

/** Top destination names by tour count from loaded catalog. */
export function topDestinationsFromTours(
  tours: readonly TourCardData[],
  limit = 6,
): string[] {
  const counts = new Map<string, number>();
  for (const tour of tours) {
    const name = tour.destination.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}
