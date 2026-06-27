import type { components } from '@tourism/core';

import { authedJson } from './authed';

export type WishlistItem = components['schemas']['WishlistItemDto'];

/** Hero (or first) image url from a media list, `null` when there is none. */
function heroUrl(media: { url: string; role: string }[]): string | null {
  const hero = media.find((m) => m.role === 'hero') ?? media[0];
  return hero?.url ?? null;
}

export interface SavedTour {
  slug: string;
  title: string;
  image: string | null;
  basePrice: string;
  currency: string;
}

/** The caller's saved tours (`GET /wishlist/me`), shaped for the dashboard. `[]` on error. */
export async function fetchSavedTours(): Promise<SavedTour[]> {
  try {
    const items = await authedJson<WishlistItem[]>('/api/v1/wishlist/me', { method: 'GET' });
    if (!Array.isArray(items)) return [];
    return items.map((it) => ({
      slug: it.tour.slug,
      title: it.tour.title,
      image: heroUrl(it.tour.media),
      basePrice: it.tour.basePrice,
      currency: it.tour.currency,
    }));
  } catch {
    return [];
  }
}
