import type { components } from '@tourism/core';

import { authedJson } from './authed';

export type WishlistItem = components['schemas']['WishlistItemDto'];

type WishlistTourMedia = { url: string; role: string; alt?: string | null };

/** Hero (or first) media item from a media list, `undefined` when there is none. */
function heroMedia(media: WishlistTourMedia[]): WishlistTourMedia | undefined {
  return media.find((m) => m.role === 'hero') ?? media[0];
}

export interface SavedTour {
  tourId: string;
  slug: string;
  title: string;
  image: string | null;
  /** Cover MediaAsset's editable alt text; null/undefined = fall back to `title` at the call site. */
  imageAlt?: string | null;
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
    return items.map((it) => {
      const hero = heroMedia(it.tour.media);
      return {
        tourId: it.tourId,
        slug: it.tour.slug,
        title: it.tour.title,
        image: hero?.url ?? null,
        imageAlt: hero?.alt,
        basePrice: it.tour.basePrice,
        currency: it.tour.currency,
      };
    });
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
