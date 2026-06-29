'use server';

import {
  addToWishlist,
  fetchSavedTourIds,
  removeFromWishlist,
} from '../api/wishlist';

/** The caller's saved tour ids — used by the detail-page heart to set its initial state. */
export async function getSavedTourIdsAction(): Promise<string[]> {
  return fetchSavedTourIds();
}

/** Save a tour (idempotent). Returns `{ ok }` so the client can roll back an optimistic toggle. */
export async function addToWishlistAction(tourId: string): Promise<{ ok: boolean }> {
  try {
    await addToWishlist(tourId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Un-save a tour. Returns `{ ok }` so the client can roll back an optimistic toggle. */
export async function removeFromWishlistAction(
  tourId: string,
): Promise<{ ok: boolean }> {
  try {
    await removeFromWishlist(tourId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
