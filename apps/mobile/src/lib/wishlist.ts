import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@tourism/core';
import { getApiClient } from './api';
import { useAuth } from './auth-context';

type WishlistItemDto = components['schemas']['WishlistItemDto'];

export interface SavedTourVm {
  tourId: string;
  slug: string;
  title: string;
  image?: string;
  basePrice: number;
  currency: string;
}

export function toSavedTourVm(dto: WishlistItemDto): SavedTourVm {
  const hero =
    dto.tour.media.find((m) => m.role === 'hero') ?? dto.tour.media[0];
  return {
    tourId: dto.tourId,
    slug: dto.tour.slug,
    title: dto.tour.title,
    image: hero?.url,
    basePrice: Number(dto.tour.basePrice),
    currency: dto.tour.currency,
  };
}

export async function fetchSavedTours(): Promise<SavedTourVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/wishlist/me');
  const list = (data as unknown as { data: WishlistItemDto[] }).data ?? [];
  return list.map(toSavedTourVm);
}

export async function fetchSavedTourIds(): Promise<string[]> {
  const items = await fetchSavedTours();
  return items.map((item) => item.tourId);
}

export async function addToWishlist(tourId: string): Promise<void> {
  await getApiClient().POST('/api/v1/wishlist/{tourId}', {
    params: { path: { tourId } },
  });
}

export async function removeFromWishlist(tourId: string): Promise<void> {
  await getApiClient().DELETE('/api/v1/wishlist/{tourId}', {
    params: { path: { tourId } },
  });
}

/** Wishlist state + optimistic toggle. Guests get `isGuest: true` and no queries. */
export function useWishlist() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const signedIn = status === 'signedIn';

  const idsQ = useQuery({
    queryKey: ['wishlist', 'ids'],
    queryFn: fetchSavedTourIds,
    enabled: signedIn,
  });
  const ids = idsQ.data ?? [];

  const toggleM = useMutation({
    mutationFn: ({ tourId, saved }: { tourId: string; saved: boolean }) =>
      saved ? removeFromWishlist(tourId) : addToWishlist(tourId),
    onMutate: async ({ tourId, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });
      const prevIds = queryClient.getQueryData<string[]>(['wishlist', 'ids']);
      const prevList = queryClient.getQueryData<SavedTourVm[]>([
        'wishlist',
        'list',
      ]);
      queryClient.setQueryData<string[]>(['wishlist', 'ids'], (old = []) =>
        saved ? old.filter((id) => id !== tourId) : [...old, tourId],
      );
      if (saved) {
        queryClient.setQueryData<SavedTourVm[]>(
          ['wishlist', 'list'],
          (old = []) => old.filter((item) => item.tourId !== tourId),
        );
      }
      return { prevIds, prevList };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(['wishlist', 'ids'], context?.prevIds);
      queryClient.setQueryData(['wishlist', 'list'], context?.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const isSaved = useCallback((tourId: string) => ids.includes(tourId), [ids]);
  const toggle = useCallback(
    (tourId: string) => toggleM.mutate({ tourId, saved: ids.includes(tourId) }),
    [toggleM, ids],
  );

  return { isGuest: !signedIn, isSaved, toggle };
}
