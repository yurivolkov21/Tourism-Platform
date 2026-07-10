import {
  toTourCard,
  type ApiResponse,
  type TourCardData,
  type TourCardsPageParams,
  type TourCardsPageResult,
  type components,
} from '@tourism/core';

import { fetchJsonWithRetry } from './fetch-json';

type TourSummaryDto = components['schemas']['TourSummaryDto'];

const DEFAULT_PAGE_SIZE = 10;

function buildToursQuery(params: TourCardsPageParams): string {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const search = params.search?.trim();
  if (search) {
    query.set('search', search);
  }
  if (params.featured != null) {
    query.set('featured', String(params.featured));
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    query.set('sortOrder', params.sortOrder);
  }
  return query.toString();
}

/**
 * Paginated tours catalog — GET /api/v1/tours with page/meta.
 * Uses global fetch (RN-safe) with retries for Render cold starts.
 */
export async function fetchTourCardsPage(
  params: TourCardsPageParams = {},
): Promise<TourCardsPageResult> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const json = await fetchJsonWithRetry<ApiResponse<TourSummaryDto[]>>(
    `/api/v1/tours?${buildToursQuery(params)}`,
    'tours',
  );
  const list = json.data ?? [];
  const meta = json.meta;
  const total = meta?.total ?? list.length;
  const resolvedPageSize = meta?.pageSize ?? pageSize;
  const totalPages =
    meta?.totalPages ?? Math.max(1, Math.ceil(total / resolvedPageSize));

  return {
    items: list.map(toTourCard),
    meta: {
      page: meta?.page ?? page,
      pageSize: resolvedPageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Public tours catalog — same GET /api/v1/tours as web (first page, large pageSize).
 * Uses global fetch (RN-safe) with retries for Render cold starts.
 */
export async function fetchTourCards(
  params: { pageSize?: number; featured?: boolean } = {},
): Promise<TourCardData[]> {
  const { items } = await fetchTourCardsPage({
    page: 1,
    pageSize: params.pageSize ?? 100,
    featured: params.featured,
  });
  return items;
}

export type { TourCardData, TourCardsPageParams, TourCardsPageResult };
