import { useCallback, useEffect, useState } from 'react';

import type { DestinationCardData } from '@tourism/core';

import { fetchDestinationCards } from '../api/destinations';

export function useDestinationCatalog() {
  const [allDestinations, setAllDestinations] = useState<DestinationCardData[]>([]);
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
      const items = await fetchDestinationCards();
      setAllDestinations(items);
    } catch (err) {
      if (__DEV__) {
        console.warn('[destinations] load failed:', err);
      }
      setError(true);
      if (!refresh) {
        setAllDestinations([]);
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
    allDestinations,
    loading,
    refreshing,
    error,
    loadCatalog,
  };
}
