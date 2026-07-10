import type { components } from '../api/schema.js';
import { TOUR_CARD_IMAGE_FALLBACK } from '../tours/tour-card.js';
import { normalizeText } from '../tours/tours-filter.js';
import { REGION_ORDER, type DestinationSummary } from './destinations.js';

type DestinationDto = components['schemas']['DestinationDto'];

export type DestinationCardData = DestinationSummary & {
  image: string;
};

export type DestinationSort = 'tours-desc' | 'name-asc' | 'name-desc';

export interface DestinationFilters {
  regions?: string[];
}

const OTHER_REGION = 'Other';

function regionBucket(region: string | null): string {
  return region && REGION_ORDER.includes(region) ? region : OTHER_REGION;
}

/** OR within facet; empty facet = no constraint. */
export function filterDestinations<T extends { region: string | null }>(
  items: readonly T[],
  filters: DestinationFilters = {},
): T[] {
  const { regions } = filters;
  if (!regions?.length) return [...items];
  return items.filter((item) => regions.includes(regionBucket(item.region)));
}

export interface SearchableDestination {
  name: string;
  description: string | null;
  region: string | null;
}

/** Accent-insensitive search over name, description, and region. */
export function searchDestinations<T extends SearchableDestination>(
  items: readonly T[],
  query: string,
): T[] {
  const q = normalizeText(query);
  if (q === '') return [...items];
  return items.filter((item) =>
    normalizeText(`${item.name} ${item.description ?? ''} ${item.region ?? ''}`).includes(q),
  );
}

/** Return a sorted copy (does not mutate input). */
export function sortDestinations<T extends DestinationSummary>(
  items: readonly T[],
  sort: DestinationSort,
): T[] {
  const copy = [...items];
  switch (sort) {
    case 'name-desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'tours-desc':
    default:
      return copy.sort(
        (a, b) => b.tourCount - a.tourCount || a.name.localeCompare(b.name),
      );
  }
}

export interface TourWithDestinations {
  destinations: { destination: { slug: string } }[];
}

/** Count published tours per destination slug (M:N). */
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

export function applyTourCounts(
  tiles: readonly DestinationCardData[],
  counts: Record<string, number>,
): DestinationCardData[] {
  return tiles.map((tile) => ({ ...tile, tourCount: counts[tile.slug] ?? 0 }));
}

export function toDestinationCard(dto: DestinationDto): DestinationCardData {
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
    slug: dto.slug,
    name: dto.name,
    country: dto.country,
    region: dto.region,
    description: dto.description,
    tourCount: 0,
    image: hero?.url ?? TOUR_CARD_IMAGE_FALLBACK,
  };
}

export { OTHER_REGION as DESTINATION_OTHER_REGION };
