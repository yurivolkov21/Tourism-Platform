import type { GallerySection } from '../components/marketing/gallery';

/** The imagery bundle a region page consumes (mirrors RegionData's image fields). */
export interface RegionImagery {
  image: string;
  images: string[];
  gallery: string[];
}

/** Cycle `urls` to produce exactly `n` entries (real photos, repeated only if short). */
export function fillTo(urls: string[], n: number): string[] {
  if (urls.length === 0) return [];
  return Array.from({ length: n }, (_, i) => urls[i % urls.length]);
}

/** Deduped real media urls across a set of destination tiles (empty for un-uploaded tiles). */
function realMediaUrls(tiles: { gallery: string[] }[]): string[] {
  return Array.from(new Set(tiles.flatMap((t) => t.gallery)));
}

/**
 * Region hero/pool/gallery from the region's real destination media, falling back
 * ENTIRELY to the curated fixture when the region has no uploaded media
 * (all-real-or-fixture — never mixed). `tiles` are the region's live destination
 * tiles (their `gallery` is empty when a destination has no uploaded media).
 */
export function deriveRegionImagery(
  tiles: { gallery: string[] }[],
  fixture: RegionImagery,
): RegionImagery {
  const real = realMediaUrls(tiles);
  if (real.length === 0) return fixture;
  return {
    image: real[0],
    images: real,
    gallery: fillTo(real, fixture.gallery.length),
  };
}

/**
 * Overview editorial gallery from all destinations' real media, falling back to the
 * placeholder frames when there is no uploaded media. Keeps the fixture frame's alt
 * captions, filling `src` from real media.
 */
export function deriveOverviewGallery(
  tiles: { gallery: string[] }[],
  fixtureFrames: GallerySection[],
): GallerySection[] {
  const real = realMediaUrls(tiles);
  if (real.length === 0) return fixtureFrames;
  const frame = fixtureFrames[0];
  const count = frame?.images.length ?? real.length;
  const images = fillTo(real, count).map((src, i) => ({
    src,
    alt: frame?.images[i]?.alt ?? '',
  }));
  return [{ ...frame, images }];
}
