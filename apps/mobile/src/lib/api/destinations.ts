import {
  applyTourCounts,
  tallyToursByDestination,
  toDestinationCard,
  type ApiResponse,
  type components,
  type DestinationCardData,
} from '@tourism/core';

import { fetchJsonWithRetry } from './fetch-json';

type DestinationDto = components['schemas']['DestinationDto'];
type TourSummaryDto = components['schemas']['TourSummaryDto'];

const CATALOG_PAGE_SIZE = 100;

export async function fetchDestinationCards(): Promise<DestinationCardData[]> {
  const json = await fetchJsonWithRetry<ApiResponse<DestinationDto[]>>(
    `/api/v1/destinations?pageSize=${CATALOG_PAGE_SIZE}`,
    'destinations',
  );
  const list = json.data ?? [];
  const tiles = list.map(toDestinationCard);

  try {
    const counts = await fetchTourDestinationCounts();
    return applyTourCounts(tiles, counts);
  } catch {
    return tiles;
  }
}

export async function fetchTourDestinationCounts(): Promise<Record<string, number>> {
  const json = await fetchJsonWithRetry<ApiResponse<TourSummaryDto[]>>(
    `/api/v1/tours?pageSize=${CATALOG_PAGE_SIZE}`,
    'tour-destination-counts',
  );
  return tallyToursByDestination(json.data ?? []);
}

export type { DestinationCardData };
