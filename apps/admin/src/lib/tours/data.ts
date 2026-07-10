import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type TourSummary = components['schemas']['TourSummaryDto'];
/**
 * `ops` is typed optional here even though the generated `AdminTourDetailDto` marks it required —
 * the API and FE can deploy out of order (Render lag), so the FE must tolerate a response from an
 * older API build that doesn't carry `ops` yet.
 */
export type TourDetail = Omit<
  components['schemas']['AdminTourDetailDto'],
  'ops'
> & {
  ops?: components['schemas']['TourOpsDto'];
};
export type PageMeta = components['schemas']['PageMetaDto'];

export interface TourListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  isPublished?: boolean;
}

export interface TourList {
  data: TourSummary[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists tours for the admin table (`GET /admin/tours`, drafts included). The wire format is already
 * `{ data, meta }` (the API's paginated envelope), so the typed body matches.
 */
export async function listTours(
  params: TourListParams = {},
): Promise<TourList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/tours', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        search: params.search,
        category: params.category,
        isPublished: params.isPublished,
      },
    },
  });
  return data as unknown as TourList;
}

/**
 * Fetches one tour by slug (enriched) for the edit form. Single resources come back wrapped in the
 * `{ data, error }` envelope at runtime (the generated client types it bare), so we unwrap here.
 */
export async function getTour(slug: string): Promise<TourDetail> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/tours/{slug}', {
    params: { path: { slug } },
  });
  return (data as unknown as { data: TourDetail }).data;
}
