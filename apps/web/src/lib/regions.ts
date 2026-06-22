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

// Temporary extra Unsplash imagery per region (review only) so the photo gallery has variety.
const u = (id: string) => `https://images.unsplash.com/${id}?w=1100&q=70&auto=format&fit=crop`;
const REGION_EXTRA_IMAGES: Record<string, string[]> = {
  'northern-vietnam': [u('photo-1559592413-7cec4d0cae2b'), u('photo-1540998145333-e2eef1a9822d')],
  'central-vietnam': [u('photo-1504457047772-27faf1c00561'), u('photo-1535139262971-c51845709a48')],
  'southern-vietnam': [u('photo-1593693397690-362cb9666fc2'), u('photo-1504457047772-27faf1c00561')],
};

/** Canonical region slugs for `generateStaticParams`. */
export function regionSlugs(): string[] {
  return groups.map((g) => slugify(g.region));
}

/** Derive a region's hero/collage/destinations/tours from the destination fixtures. */
export function getRegion(regionSlug: string): RegionData | undefined {
  const group = groups.find((g) => slugify(g.region) === regionSlug);
  if (!group) return undefined;
  // Image pool (destination covers + galleries + region extras) for the bento and photo gallery.
  const images = Array.from(
    new Set([
      ...group.items.flatMap((d) => [d.image, ...d.gallery]),
      ...(REGION_EXTRA_IMAGES[regionSlug] ?? []),
    ]),
  );

  return {
    name: group.region,
    image: group.items[0]?.image ?? '',
    images,
    destinations: group.items.map((d) => ({ name: d.name, slug: d.slug })),
    tours: group.items.flatMap((d) => d.tours),
  };
}
