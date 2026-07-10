import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type CancellationRequest =
  components['schemas']['AdminCancellationRequestDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface CancellationRequestListParams {
  page?: number;
  pageSize?: number;
  status?: CancellationRequest['status'];
}

export interface CancellationRequestList {
  data: CancellationRequest[];
  meta: PageMeta;
}

/** Lists cancellation requests (`GET /admin/cancellation-requests`) — server-side pagination, defaults to the REQUESTED queue. */
export async function listCancellationRequests(
  params: CancellationRequestListParams = {},
): Promise<CancellationRequestList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/cancellation-requests', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        status: params.status,
      },
    },
  });
  return data as unknown as CancellationRequestList;
}
