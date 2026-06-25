import type { components } from '@tourism/core';

import { getApiClient } from './client';
import { getAuthedApiClient } from './authed-client';

export type DepartureDto = components['schemas']['DepartureDto'];
export type BookingDto = components['schemas']['BookingDto'];
type TourDetailDto = components['schemas']['TourDetailDto'];

/** Minimal tour fields the booking page needs (title + per-person base price + hero). */
export interface BookingTour {
  slug: string;
  title: string;
  basePrice: number;
  currency: string;
  image?: string;
}

/** A bookable departure, shaped for the form's picker + live price. */
export interface DepartureOption {
  id: string;
  label: string;
  /** Effective per-person price (departure override, else the tour base price). */
  price: number;
  seatsLeft: number;
}

/** "Fri, 15 Aug 2026" from a `YYYY-MM-DD` date (UTC to avoid an off-by-one at the day boundary). */
function formatDepartureLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Maps open departures → picker options, resolving the effective per-person price + seats left. */
export function toDepartureOptions(
  departures: DepartureDto[],
  basePrice: number,
): DepartureOption[] {
  return departures.map((d) => ({
    id: d.id,
    label: formatDepartureLabel(d.startDate),
    price: d.priceOverride != null ? Number(d.priceOverride) : basePrice,
    seatsLeft: Math.max(0, d.seatsTotal - d.seatsBooked),
  }));
}

/** Minimal tour read for the booking page (public, enveloped → unwrap `.data`). `null` if unknown. */
export async function fetchBookingTour(slug: string): Promise<BookingTour | null> {
  try {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/tours/{slug}', {
      params: { path: { slug } },
    });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    if (error || !dto) return null;
    const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
    return {
      slug: dto.slug,
      title: dto.title,
      basePrice: Number(dto.basePrice),
      currency: dto.currency,
      image: hero?.url,
    };
  } catch {
    return null;
  }
}

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
