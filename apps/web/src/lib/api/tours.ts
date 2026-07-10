import type { TourCardData, TourBadgeKey } from '@tourism/core';
import { fetchTourCardsFromApi, toTourCard } from '@tourism/core';

import { getApiClient } from './client';

export type { TourCardData, TourBadgeKey };
export { toTourCard };

export async function fetchTourCards(
  params: { pageSize?: number; featured?: boolean } = {},
): Promise<TourCardData[]> {
  return fetchTourCardsFromApi(getApiClient(), params);
}
