import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type Destination = components['schemas']['DestinationDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface DestinationListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Admin-only status filter; omit for all (active + drafts). */
  isActive?: boolean;
}

export interface DestinationList {
  data: Destination[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists destinations for the admin table (`GET /admin/destinations`, drafts included). The wire
 * format is already `{ data, meta }` (the API's paginated envelope), so the typed body matches.
 */
export async function listDestinations(params: DestinationListParams = {}): Promise<DestinationList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/destinations', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        search: params.search,
        isActive: params.isActive,
      },
    },
  });
  return data as unknown as DestinationList;
}

/**
 * Fetches one destination by slug for the edit form. Single resources come back wrapped in the
 * `{ data, error }` envelope at runtime (the generated client types it bare), so we unwrap here.
 */
export async function getDestination(slug: string): Promise<Destination> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/destinations/{slug}', {
    params: { path: { slug } },
  });
  return (data as unknown as { data: Destination }).data;
}
