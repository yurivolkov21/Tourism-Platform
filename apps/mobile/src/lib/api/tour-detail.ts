import {
  mapPublicReview,
  toTourDetail,
  type TourDetailData,
  type TourDetailReview,
  type components,
} from '@tourism/core';

import { fetchJsonWithRetry } from './fetch-json';

type TourDetailDto = components['schemas']['TourDetailDto'];
type PublicReviewDto = components['schemas']['PublicReviewDto'];

export type { TourDetailData, TourDetailReview };

export async function fetchTourDetail(slug: string): Promise<TourDetailData | null> {
  try {
    const json = await fetchJsonWithRetry<{ data?: TourDetailDto }>(
      `/api/v1/tours/${encodeURIComponent(slug)}`,
      'tour-detail',
    );
    const dto = json.data;
    if (!dto) return null;
    const reviews = await fetchTourReviews(slug).catch(() => []);
    return toTourDetail(dto, reviews);
  } catch {
    return null;
  }
}

export async function fetchTourDetailOrThrow(slug: string): Promise<TourDetailData> {
  const json = await fetchJsonWithRetry<{ data?: TourDetailDto }>(
    `/api/v1/tours/${encodeURIComponent(slug)}`,
    'tour-detail',
  );
  const dto = json.data;
  if (!dto) {
    throw new Error('Tour not found');
  }
  const reviews = await fetchTourReviews(slug).catch(() => []);
  return toTourDetail(dto, reviews);
}

/** Approved public reviews — empty array on failure (section omitted in UI). */
export async function fetchTourReviews(slug: string): Promise<TourDetailReview[]> {
  const json = await fetchJsonWithRetry<{ data?: PublicReviewDto[] }>(
    `/api/v1/tours/${encodeURIComponent(slug)}/reviews?pageSize=9`,
    'tour-reviews',
  );
  return (json.data ?? []).map(mapPublicReview);
}
