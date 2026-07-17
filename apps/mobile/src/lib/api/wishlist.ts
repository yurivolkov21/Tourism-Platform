import { ApiRequestError, type TourCardData, type components } from '@tourism/core';

import { getApiAccessToken, getApiBaseUrl } from './client';

export type WishlistItem = components['schemas']['WishlistItemDto'];

async function authedJson<T>(
  path: string,
  init: RequestInit = { method: 'GET' },
): Promise<T | null> {
  const token = await getApiAccessToken();
  if (!token) {
    throw new ApiRequestError(401, { code: 'UNAUTHORIZED', message: 'Not signed in' });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (init.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });

  if (res.status === 204) {
    return null;
  }

  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;

  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      json?.error ?? { code: 'UNKNOWN', message: res.statusText },
    );
  }
  return (json?.data ?? null) as T | null;
}

function heroUrl(media: { url: string; role: string }[]): string | undefined {
  const hero = media.find((m) => m.role === 'hero') ?? media[0];
  return hero?.url;
}

/** Map API wishlist preview → TourCardData for Saved tab / hearts. */
export function wishlistItemToTourCard(item: WishlistItem): TourCardData {
  const tour = item.tour;
  return {
    id: tour.id,
    slug: tour.slug,
    title: tour.title,
    destination: '',
    durationDays: tour.durationDays,
    basePrice: Number(tour.basePrice),
    currency: tour.currency,
    rating: 0,
    reviewCount: 0,
    badges: [],
    image: heroUrl(tour.media),
    summary: tour.summary ?? undefined,
  };
}

/** Caller's saved tours (`GET /wishlist/me`). `[]` when unsigned / error. */
export async function fetchSavedTours(): Promise<TourCardData[]> {
  try {
    const items = await authedJson<WishlistItem[]>('/api/v1/wishlist/me', {
      method: 'GET',
    });
    if (!Array.isArray(items)) return [];
    return items.map(wishlistItemToTourCard);
  } catch {
    return [];
  }
}

export async function fetchSavedTourIds(): Promise<string[]> {
  const tours = await fetchSavedTours();
  return tours.map((t) => t.id);
}

export async function addToWishlist(tourId: string): Promise<void> {
  await authedJson(`/api/v1/wishlist/${encodeURIComponent(tourId)}`, {
    method: 'POST',
  });
}

export async function removeFromWishlist(tourId: string): Promise<void> {
  await authedJson(`/api/v1/wishlist/${encodeURIComponent(tourId)}`, {
    method: 'DELETE',
  });
}
