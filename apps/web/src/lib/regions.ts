import { groupByRegion } from '@tourism/core';

import type { TourCardData } from '../components/tours/tour-card';
import { destinations } from './destinations.fixtures';
import { slugify } from './slug';

export interface RegionData {
  name: string;
  /** Hero cover (first destination's image). */
  image: string;
  /** Pool for the intro bento (destination covers + galleries). */
  images: string[];
  /** Curated 10-image set for the photo gallery (single + cluster + cluster + single). */
  gallery: string[];
  destinations: { name: string; slug: string }[];
  tours: TourCardData[];
}

// Grouped once at module load (composition of the TDD'd core `groupByRegion`).
const groups = groupByRegion(destinations).filter((g) => g.region !== 'Other');

// Temporary Unsplash imagery (review only) — a curated 10-image gallery set per region.
const u = (id: string) => `https://images.unsplash.com/${id}?w=1100&q=70&auto=format&fit=crop`;
const REGION_GALLERY_IMAGES: Record<string, string[]> = {
  'northern-vietnam': [
    'photo-1528127269322-539801943592',
    'photo-1573790387438-4da905039392',
    'photo-1528181304800-259b08848526',
    'photo-1559592413-7cec4d0cae2b',
    'photo-1540998145333-e2eef1a9822d',
    'photo-1518181835702-6eef8b4b2113',
    'photo-1465056836041-7f43ac27dcb5',
    'photo-1473625247510-8ceb1760943f',
    'photo-1476514525535-07fb3b4ae5f1',
    'photo-1518509562904-e7ef99cdcc86',
  ].map(u),
  'central-vietnam': [
    'photo-1583417319070-4a69db38a482',
    'photo-1555921015-5532091f6026',
    'photo-1602002418816-5c0aeef426aa',
    'photo-1504457047772-27faf1c00561',
    'photo-1535139262971-c51845709a48',
    'photo-1528909514045-2fa4ac7a08ba',
    'photo-1559592413-7cec4d0cae2b',
    'photo-1465056836041-7f43ac27dcb5',
    'photo-1476514525535-07fb3b4ae5f1',
    'photo-1518181835702-6eef8b4b2113',
  ].map(u),
  'southern-vietnam': [
    'photo-1528181304800-259b08848526',
    'photo-1583417319070-4a69db38a482',
    'photo-1602002418816-5c0aeef426aa',
    'photo-1593693397690-362cb9666fc2',
    'photo-1504457047772-27faf1c00561',
    'photo-1540998145333-e2eef1a9822d',
    'photo-1528909514045-2fa4ac7a08ba',
    'photo-1473625247510-8ceb1760943f',
    'photo-1518509562904-e7ef99cdcc86',
    'photo-1535139262971-c51845709a48',
  ].map(u),
};

/** Canonical region slugs for `generateStaticParams`. */
export function regionSlugs(): string[] {
  return groups.map((g) => slugify(g.region));
}

/** Derive a region's hero/collage/destinations/tours from the destination fixtures. */
export function getRegion(regionSlug: string): RegionData | undefined {
  const group = groups.find((g) => slugify(g.region) === regionSlug);
  if (!group) return undefined;
  // Bento pool (destination covers + galleries).
  const images = Array.from(new Set(group.items.flatMap((d) => [d.image, ...d.gallery])));

  return {
    name: group.region,
    image: group.items[0]?.image ?? '',
    images,
    gallery: REGION_GALLERY_IMAGES[regionSlug] ?? images,
    destinations: group.items.map((d) => ({ name: d.name, slug: d.slug })),
    tours: group.items.flatMap((d) => d.tours),
  };
}
