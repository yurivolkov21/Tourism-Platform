import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type AdminOutboxRow = components['schemas']['AdminOutboxRowDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface OutboxListParams {
  page?: number;
  pageSize?: number;
  status?: 'PENDING' | 'SENT' | 'FAILED';
}

export interface OutboxList {
  data: AdminOutboxRow[];
  meta: PageMeta;
}

/** Lists queued transactional emails (`GET /api/v1/admin/outbox`) — server-side filter + pagination. */
export async function listOutbox(
  params: OutboxListParams = {},
): Promise<OutboxList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/outbox', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        status: params.status,
      },
    },
  });
  return data as unknown as OutboxList;
}
