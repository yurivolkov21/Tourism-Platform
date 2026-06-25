import type { components } from '@tourism/core';

import { getApiClient } from './client';
import { getAuthedApiClient } from './authed-client';

export type DepartureDto = components['schemas']['DepartureDto'];
export type BookingDto = components['schemas']['BookingDto'];

/**
 * Open, upcoming departures for a tour (public read — no token needed). The list response is the
 * `{ data }` envelope, so we unwrap `.data`. Returns `[]` on any error so the booking page can render
 * a graceful "no departures" state instead of throwing.
 */
export async function fetchTourDepartures(slug: string): Promise<DepartureDto[]> {
  try {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/tours/{slug}/departures', {
      params: { path: { slug }, query: { status: 'OPEN' } },
    });
    if (error) return [];
    return (data as unknown as { data?: DepartureDto[] } | undefined)?.data ?? [];
  } catch {
    return [];
  }
}

/**
 * One booking by code for the signed-in caller (owner-or-admin on the API). Used by the booking page
 * + the checkout result pages. Single-resource response is enveloped → unwrap `.data`. Returns `null`
 * on a missing/forbidden booking (the API collapses both to 404) so callers render a not-found state.
 */
export async function fetchBooking(code: string): Promise<BookingDto | null> {
  try {
    const api = await getAuthedApiClient();
    const { data, error } = await api.GET('/api/v1/bookings/{code}', {
      params: { path: { code } },
    });
    if (error) return null;
    return (data as unknown as { data?: BookingDto } | undefined)?.data ?? null;
  } catch {
    return null;
  }
}
