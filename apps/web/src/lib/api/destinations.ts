import type { components } from '@tourism/core';

import type { DestinationTileVM } from '../destinations.fixtures';
import { tallyToursByDestination } from '../destination-counts';
import {
  selectRegionBookables,
  type RegionBookables,
} from '../region-bookables';
import { TAGS } from '../revalidate';
import { fetchTourCards } from './tours';
import { getApiClient } from './client';

type DestinationDto = components['schemas']['DestinationDto'];
type TourSummaryDto = components['schemas']['TourSummaryDto'];

// Fallback cover when a destination has no media yet (keeps next/image happy).
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=1100&q=70&auto=format&fit=crop';

/**
 * Adapts an API destination → the overview tile view-model. The overview only renders
 * `image/name/tagline/region`; `intro/gallery/tours` are required by the VM type but unused there,
 * so they get safe defaults. `tagline`/`intro` derive from `description`.
 */
export function toDestinationTile(dto: DestinationDto): DestinationTileVM {
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
    slug: dto.slug,
    name: dto.name,
    country: dto.country,
    region: dto.region,
    description: dto.description,
    tourCount: 0,
    tagline: dto.description ?? '',
    image: hero?.url ?? PLACEHOLDER_IMG,
    imageAlt: hero?.alt,
    intro: dto.description ?? '',
    gallery: dto.media.map((m) => m.url),
    tours: [],
  };
}

/** Fetches active destinations as overview tiles (grouped by region on the page). */
export async function fetchDestinationTiles(): Promise<DestinationTileVM[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/destinations', {
    params: { query: { pageSize: 100 } },
    // Tagged: the API busts `destinations` on destination create/update/delete.
    next: { tags: [TAGS.DESTINATIONS] },
  });
  const list = (data as unknown as { data: DestinationDto[] }).data ?? [];
  return list.map(toDestinationTile);
}

/**
 * Real destinations (tabs) + tours for a region page, by region display name (e.g. "Northern
 * Vietnam"). Composes the live destination tiles + tour cards through the pure selector. Returns
 * empty on any error so the page can fall back to its curated fixtures.
 */
export async function fetchRegionBookables(
  regionName: string,
): Promise<RegionBookables> {
  try {
    const [tiles, tours] = await Promise.all([
      fetchDestinationTiles(),
      fetchTourCards(),
    ]);
    return selectRegionBookables(tiles, tours, regionName);
  } catch {
    return { destinations: [], tours: [] };
  }
}

/**
 * Real published-tour count per destination slug (M:N). Reads the raw tour
 * summaries (which carry the full `destinations[]`, unlike the card VM) and
 * tallies. Empty on error so callers can default counts to 0.
 */
export async function fetchTourDestinationCounts(): Promise<
  Record<string, number>
> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours', {
    params: { query: { pageSize: 100 } },
    // Counts change when tours change (they tally tour→destination links).
    next: { tags: [TAGS.TOURS, TAGS.DESTINATIONS] },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return tallyToursByDestination(list);
}
