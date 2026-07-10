import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type Departure = components['schemas']['DepartureDto'];

export interface DepartureListParams {
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED';
  from?: string;
  to?: string;
}

/**
 * Lists a tour's departures (`GET /admin/tours/:slug/departures`, full history, ordered by startDate
 * asc). The endpoint returns a plain array → wrapped in the `{ data, error }` envelope at runtime, so
 * we unwrap `.data` (the generated client types it bare).
 */
export async function listDepartures(
  slug: string,
  params: DepartureListParams = {},
): Promise<Departure[]> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/tours/{slug}/departures', {
    params: {
      path: { slug },
      query: { status: params.status, from: params.from, to: params.to },
    },
  });
  return (data as unknown as { data: Departure[] }).data;
}

/** Finds one departure within a tour's list by id (the API has no GET-one) — for the edit form. */
export async function findDeparture(
  slug: string,
  id: string,
): Promise<Departure | undefined> {
  const departures = await listDepartures(slug);
  return departures.find((d) => d.id === id);
}
