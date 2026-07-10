import type { TourCardData } from '../components/tours/tour-card';

/** A destination tab (L2) on a region page. */
export interface RegionDestination {
  name: string;
  slug: string;
  /** Real uploaded media urls for this destination (empty when none) — feeds region-page imagery derivation. */
  gallery: string[];
}

/** The bookable content of a region page: its destinations (tabs) + the tours within them. */
export interface RegionBookables {
  destinations: RegionDestination[];
  tours: TourCardData[];
}

/** Minimal destination-tile shape the region selection needs (the API VM is structurally compatible). */
export interface RegionTile {
  name: string;
  slug: string;
  /** Nullable to match the API VM (`DestinationDto.region` is optional); a null never matches a region. */
  region: string | null;
  /** Real media urls (from the API VM); passed through so the region page can derive imagery. */
  gallery: string[];
}

/**
 * Pure: pick a region's destinations + tours from the full catalogue. A destination belongs to the
 * region when its `region` matches `regionName`; a tour belongs when its (primary) `destination` is
 * one of those destinations. Input order is preserved; inputs are not mutated.
 */
export function selectRegionBookables(
  tiles: readonly RegionTile[],
  tours: readonly TourCardData[],
  regionName: string,
): RegionBookables {
  const inRegion = tiles.filter((tile) => tile.region === regionName);
  const names = new Set(inRegion.map((d) => d.name));
  return {
    destinations: inRegion.map((d) => ({
      name: d.name,
      slug: d.slug,
      gallery: d.gallery,
    })),
    tours: tours.filter((tour) => names.has(tour.destination)),
  };
}
