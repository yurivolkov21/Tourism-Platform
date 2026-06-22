import { groupByRegion } from '@tourism/core';

import type { TourCardData } from '../components/tours/tour-card';
import { destinations } from './destinations.fixtures';
import { slugify } from './slug';

export interface RegionData {
  name: string;
  /** Hero cover (first destination's image). */
  image: string;
  /** Collage images (destinations' covers). */
  images: string[];
  destinations: { name: string; slug: string }[];
  tours: TourCardData[];
}

// Grouped once at module load (composition of the TDD'd core `groupByRegion`).
const groups = groupByRegion(destinations).filter((g) => g.region !== 'Other');

/** Canonical region slugs for `generateStaticParams`. */
export function regionSlugs(): string[] {
  return groups.map((g) => slugify(g.region));
}

/** Derive a region's hero/collage/destinations/tours from the destination fixtures. */
export function getRegion(regionSlug: string): RegionData | undefined {
  const group = groups.find((g) => slugify(g.region) === regionSlug);
  if (!group) return undefined;
  // Image pool (destination covers + galleries) for the intro bento and the photo gallery.
  const images = Array.from(
    new Set(group.items.flatMap((d) => [d.image, ...d.gallery])),
  );

  return {
    name: group.region,
    image: group.items[0]?.image ?? '',
    images,
    destinations: group.items.map((d) => ({ name: d.name, slug: d.slug })),
    tours: group.items.flatMap((d) => d.tours),
  };
}
