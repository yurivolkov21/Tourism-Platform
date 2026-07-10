import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';
import type { AdminBookingDetail } from './detail';
import type { BookingStatus } from './format';

/** List-row shape (`GET /admin/bookings`). Detail uses the richer {@link AdminBookingDetail}. */
export type Booking = components['schemas']['BookingDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface BookingListParams {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
  search?: string;
  tourId?: string;
  departureId?: string;
  userId?: string;
}

export interface BookingList {
  data: Booking[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists bookings for the admin table (`GET /admin/bookings`, all statuses). Filtering (status +
 * free-text search) and pagination are done **server-side** — bookings are transactional data that
 * grows unbounded, so we never load the whole set into the client. The wire format is already the
 * `{ data, meta }` envelope, so the typed body matches.
 */
export async function listBookings(
  params: BookingListParams = {},
): Promise<BookingList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/bookings', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        status: params.status,
        search: params.search,
        tourId: params.tourId,
        departureId: params.departureId,
        userId: params.userId,
      },
    },
  });
  return data as unknown as BookingList;
}

/**
 * Fetches one booking by code for the detail page. Single resources come back wrapped in the
 * `{ data, error }` envelope at runtime (the generated client types it bare), so we unwrap here.
 */
export async function getBooking(code: string): Promise<AdminBookingDetail> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/bookings/{code}', {
    params: { path: { code } },
  });
  return (data as unknown as { data: AdminBookingDetail }).data;
}
