import { ApiRequestError, type components } from '@tourism/core';

import { getApiAccessToken, getApiBaseUrl } from './client';

export type BookingDto = components['schemas']['BookingDto'];

async function authedJson<T>(path: string, init: RequestInit = { method: 'GET' }): Promise<T> {
  const token = await getApiAccessToken();
  if (!token) {
    throw new ApiRequestError(401, { code: 'UNAUTHORIZED', message: 'Not signed in' });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (init.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });

  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;

  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      json?.error ?? { code: 'UNKNOWN', message: res.statusText },
    );
  }
  return json?.data as T;
}

/** Caller bookings — same as web `fetchMyBookings` (empty on error / no token). */
export async function fetchMyBookings(): Promise<BookingDto[]> {
  try {
    const data = await authedJson<BookingDto[]>('/api/v1/bookings/me');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** One booking by code for the signed-in owner. */
export async function fetchBooking(code: string): Promise<BookingDto | null> {
  try {
    return await authedJson<BookingDto>(
      `/api/v1/bookings/${encodeURIComponent(code)}`,
    );
  } catch {
    return null;
  }
}
