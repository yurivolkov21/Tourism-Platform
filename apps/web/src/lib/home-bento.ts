import type { DestinationTileVM } from './destinations.fixtures';

/** One bento slot: a destination slug plus its optional grid-span emphasis. */
export interface HomeBentoSlot {
  slug: string;
  /** Tailwind grid span for the home bento (literal so Tailwind detects it). */
  span?: string;
}

/**
 * The curated six-tile home bento, in layout order. Slugs map to seeded
 * destinations; spans preserve the original Lily-style emphasis (one large
 * feature + three wide tiles + two single tiles).
 */
export const HOME_BENTO: readonly HomeBentoSlot[] = [
  { slug: 'ha-long-bay', span: 'lg:col-span-2 lg:row-span-2' },
  { slug: 'sa-pa', span: 'lg:col-span-2' },
  { slug: 'hoi-an' },
  { slug: 'hue' },
  { slug: 'ho-chi-minh-city', span: 'lg:col-span-2' },
  { slug: 'mekong-delta', span: 'lg:col-span-2' },
];

/**
 * Curate a flat destination-tile list into the home bento: returns the tiles
 * whose slug appears in `config`, in config order, each carrying its slot
 * `span`. Configured slugs absent from `tiles` are skipped (the bento simply
 * shrinks). Pure + immutable — source tiles are never mutated.
 */
export function pickHomeBento(
  tiles: readonly DestinationTileVM[],
  config: readonly HomeBentoSlot[] = HOME_BENTO,
): DestinationTileVM[] {
  const bySlug = new Map(tiles.map((t) => [t.slug, t]));
  const out: DestinationTileVM[] = [];
  for (const slot of config) {
    const tile = bySlug.get(slot.slug);
    if (tile) out.push({ ...tile, span: slot.span });
  }
  return out;
}
