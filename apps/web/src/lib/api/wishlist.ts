import { authedJson } from './authed';

/** Count of tours on the caller's wishlist (`GET /wishlist/me`). `0` on error / not-synced. */
export async function fetchWishlistCount(): Promise<number> {
  try {
    const items = await authedJson<unknown[]>('/api/v1/wishlist/me', { method: 'GET' });
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}
