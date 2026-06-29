import type { components } from '@tourism/core';

import type { CreateBookingPayload } from '../booking/booking-form';
import { authedJson } from './authed';
import { getApiClient } from './client';

export type DepartureDto = components['schemas']['DepartureDto'];
export type BookingDto = components['schemas']['BookingDto'];
export type CheckoutSessionDto = components['schemas']['CheckoutSessionDto'];
type TourDetailDto = components['schemas']['TourDetailDto'];

/** The caller's bookings, newest first (top 50 on the API). Empty on error. */
export async function fetchMyBookings(): Promise<BookingDto[]> {
  try {
    const data = await authedJson<BookingDto[]>('/api/v1/bookings/me', {
      method: 'GET',
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Create a PENDING booking (`POST /bookings`). Throws `ApiRequestError` on failure. */
export async function createBooking(
  payload: CreateBookingPayload,
): Promise<BookingDto> {
  return authedJson<BookingDto>('/api/v1/bookings', {
    method: 'POST',
    body: payload,
  });
}

/** Cancel the caller's own PENDING booking (`POST /bookings/{code}/cancel`). Throws on failure. */
export async function cancelBooking(code: string): Promise<void> {
  await authedJson(`/api/v1/bookings/${encodeURIComponent(code)}/cancel`, {
    method: 'POST',
  });
}

/** Start a checkout session for a PENDING booking (`POST /bookings/{code}/checkout`). */
export async function startCheckout(code: string): Promise<CheckoutSessionDto> {
  return authedJson<CheckoutSessionDto>(
    `/api/v1/bookings/${encodeURIComponent(code)}/checkout`,
    { method: 'POST' },
  );
}

/** Capture an approved PayPal order (`POST /bookings/{code}/capture`). Idempotent on the API. */
export async function captureBookingOrder(code: string): Promise<void> {
  await authedJson<BookingDto>(
    `/api/v1/bookings/${encodeURIComponent(code)}/capture`,
    {
      method: 'POST',
    },
  );
}

/** Minimal tour fields the booking page needs (title + per-person base price + hero). */
export interface BookingTour {
  id: string;
  slug: string;
  title: string;
  basePrice: number;
  currency: string;
  durationDays: number;
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
export async function fetchBookingTour(
  slug: string,
): Promise<BookingTour | null> {
  try {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/tours/{slug}', {
      params: { path: { slug } },
    });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    if (error || !dto) return null;
    const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
    return {
      id: dto.id,
      slug: dto.slug,
      title: dto.title,
      basePrice: Number(dto.basePrice),
      currency: dto.currency,
      durationDays: dto.durationDays,
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
export async function fetchTourDepartures(
  slug: string,
): Promise<DepartureDto[]> {
  try {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/tours/{slug}/departures', {
      params: { path: { slug }, query: { status: 'OPEN' } },
    });
    if (error) return [];
    return (
      (data as unknown as { data?: DepartureDto[] } | undefined)?.data ?? []
    );
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
    return await authedJson<BookingDto>(
      `/api/v1/bookings/${encodeURIComponent(code)}`,
      {
        method: 'GET',
      },
    );
  } catch {
    return null;
  }
}
