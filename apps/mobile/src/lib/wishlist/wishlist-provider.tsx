import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { TourCardData } from '@tourism/core';

import { getApiAccessToken } from '../api/client';
import {
  addToWishlist,
  fetchSavedTours,
  removeFromWishlist,
} from '../api/wishlist';

const STORAGE_KEY = '@tourism/mobile/wishlist/v1';

type WishlistContextValue = {
  ready: boolean;
  savedTours: TourCardData[];
  isSaved: (tourId: string) => boolean;
  toggleSave: (tour: TourCardData) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

async function readLocal(): Promise<TourCardData[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { tours?: TourCardData[] };
    return Array.isArray(parsed.tours) ? parsed.tours.filter((t) => t?.id && t?.slug) : [];
  } catch {
    return [];
  }
}

async function writeLocal(tours: TourCardData[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ tours }));
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [savedTours, setSavedTours] = useState<TourCardData[]>([]);

  const persist = useCallback(async (next: TourCardData[]) => {
    setSavedTours(next);
    await writeLocal(next);
  }, []);

  const refresh = useCallback(async () => {
    const token = await getApiAccessToken();
    if (token) {
      const remote = await fetchSavedTours();
      // Prefer remote when signed in; keep local as offline fallback if remote empty + local has items
      if (remote.length > 0) {
        await persist(remote);
        return;
      }
    }
    const local = await readLocal();
    setSavedTours(local);
  }, [persist]);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const isSaved = useCallback(
    (tourId: string) => savedTours.some((t) => t.id === tourId),
    [savedTours],
  );

  const toggleSave = useCallback(
    async (tour: TourCardData) => {
      if (!tour.id) return;
      const currentlySaved = savedTours.some((t) => t.id === tour.id);
      const next = currentlySaved
        ? savedTours.filter((t) => t.id !== tour.id)
        : [tour, ...savedTours.filter((t) => t.id !== tour.id)];

      await persist(next);

      const token = await getApiAccessToken();
      if (!token) return;

      try {
        if (currentlySaved) {
          await removeFromWishlist(tour.id);
        } else {
          await addToWishlist(tour.id);
        }
      } catch {
        // Roll back optimistic local change on API failure
        await persist(savedTours);
      }
    },
    [persist, savedTours],
  );

  const value = useMemo(
    () => ({ ready, savedTours, isSaved, toggleSave, refresh }),
    [ready, savedTours, isSaved, toggleSave, refresh],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return ctx;
}
