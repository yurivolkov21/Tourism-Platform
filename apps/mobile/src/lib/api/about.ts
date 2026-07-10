import {
  computeAboutMetrics,
  formatAboutMetricValues,
  type AboutMetrics,
} from '@tourism/core';

import { getApiClient } from './client';
import { fetchTourCards } from './tours';

export async function fetchAboutMetrics(): Promise<AboutMetrics> {
  try {
    const api = getApiClient();
    const [tours, destRes] = await Promise.all([
      fetchTourCards().catch(() => []),
      api.GET('/api/v1/destinations'),
    ]);
    const destinations =
      (destRes.data as { data?: { region: string | null }[] }).data ?? [];
    return computeAboutMetrics(tours, destinations);
  } catch {
    return { tours: 0, destinations: 0, regions: 0, rating: 0 };
  }
}

export { formatAboutMetricValues };
