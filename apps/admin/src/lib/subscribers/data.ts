import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type Subscriber = components['schemas']['SubscriberDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface SubscriberListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface SubscriberList {
  data: Subscriber[];
  meta: PageMeta;
}

/** Lists newsletter subscribers (`GET /admin/newsletter/subscribers`) — server-side search + pagination. */
export async function listSubscribers(params: SubscriberListParams = {}): Promise<SubscriberList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/newsletter/subscribers', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      },
    },
  });
  return data as unknown as SubscriberList;
}
