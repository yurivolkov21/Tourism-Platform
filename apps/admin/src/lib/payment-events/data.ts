import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type AdminPaymentEvent = components['schemas']['AdminPaymentEventDto'];
export type PageMeta = components['schemas']['PageMetaDto'];
export type PaymentEventProvider = AdminPaymentEvent['provider'];

export interface PaymentEventListParams {
  page?: number;
  pageSize?: number;
  provider?: PaymentEventProvider;
  type?: string;
  search?: string;
}

export interface PaymentEventList {
  data: AdminPaymentEvent[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists provider webhook events for the admin debugging surface (`GET /admin/payment-events`,
 * newest-first). Filtering (provider, type-contains, eventId-contains search) and pagination are
 * server-side — the wire format is already the `{ data, meta }` envelope.
 */
export async function listPaymentEvents(
  params: PaymentEventListParams = {},
): Promise<PaymentEventList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/payment-events', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        provider: params.provider,
        type: params.type,
        search: params.search,
      },
    },
  });
  return data as unknown as PaymentEventList;
}
