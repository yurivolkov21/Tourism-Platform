import { useCallback, useEffect, useState } from 'react';

import type { TourCardData } from '@tourism/core';

import { fetchTourCards } from '../api/tours';

const CATALOG_PAGE_SIZE = 100;

export function useTourCatalog() {
  const [allTours, setAllTours] = useState<TourCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadCatalog = useCallback(async (options: { refresh?: boolean } = {}) => {
    const { refresh = false } = options;
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const items = await fetchTourCards({ pageSize: CATALOG_PAGE_SIZE });
      setAllTours(items);
    } catch (err) {
      if (__DEV__) {
        console.warn('[tours] load failed:', err);
      }
      setError(true);
      if (!refresh) {
        setAllTours([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  return {
    allTours,
    loading,
    refreshing,
    error,
    loadCatalog,
  };
}
