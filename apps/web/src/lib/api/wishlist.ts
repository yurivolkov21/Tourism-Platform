import type { components } from '@tourism/core';

import { authedJson } from './authed';

export type WishlistItem = components['schemas']['WishlistItemDto'];

/** Hero (or first) image url from a media list, `null` when there is none. */
function heroUrl(media: { url: string; role: string }[]): string | null {
  const hero = media.find((m) => m.role === 'hero') ?? media[0];
  return hero?.url ?? null;
}

export interface SavedTour {
  tourId: string;
  slug: string;
  title: string;
  image: string | null;
  basePrice: string;
  currency: string;
}

/** The caller's saved tours (`GET /wishlist/me`), shaped for the dashboard. `[]` on error. */
export async function fetchSavedTours(): Promise<SavedTour[]> {
  try {
    const items = await authedJson<WishlistItem[]>('/api/v1/wishlist/me', {
      method: 'GET',
    });
    if (!Array.isArray(items)) return [];
    return items.map((it) => ({
      tourId: it.tourId,
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

/** Just the caller's saved tour ids (`GET /wishlist/me`) — for the detail-page heart's initial state. */
export async function fetchSavedTourIds(): Promise<string[]> {
  try {
    const items = await authedJson<WishlistItem[]>('/api/v1/wishlist/me', {
      method: 'GET',
    });
    return Array.isArray(items) ? items.map((it) => it.tourId) : [];
  } catch {
    return [];
  }
}

/** Add a tour to the caller's wishlist (`POST /wishlist/:tourId`, idempotent). */
export async function addToWishlist(tourId: string): Promise<void> {
  await authedJson(`/api/v1/wishlist/${encodeURIComponent(tourId)}`, {
    method: 'POST',
  });
}

/** Remove a tour from the caller's wishlist (`DELETE /wishlist/:tourId`). */
export async function removeFromWishlist(tourId: string): Promise<void> {
  await authedJson(`/api/v1/wishlist/${encodeURIComponent(tourId)}`, {
    method: 'DELETE',
  });
}
