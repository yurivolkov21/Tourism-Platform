import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';
import type { EnquiryStatus } from './status';

export type Enquiry = components['schemas']['EnquiryDto'];
export type PageMeta = components['schemas']['PageMetaDto'];
export type EnquiryNote = components['schemas']['EnquiryNoteDto'];

export interface EnquiryListParams {
  page?: number;
  pageSize?: number;
  status?: EnquiryStatus;
  search?: string;
}

export interface EnquiryList {
  data: Enquiry[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists enquiries for the admin CRM table (`GET /admin/enquiries`). Status filter, pagination, and
 * search are **server-side** (the API supports them all). The wire format is already the `{ data, meta }` envelope.
 */
export async function listEnquiries(
  params: EnquiryListParams = {},
): Promise<EnquiryList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/enquiries', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        status: params.status,
        search: params.search,
      },
    },
  });
  return data as unknown as EnquiryList;
}
