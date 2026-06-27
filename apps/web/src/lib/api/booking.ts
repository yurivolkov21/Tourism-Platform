import { ApiRequestError, type components } from '@tourism/core';

import type { CreateBookingPayload } from '../booking/booking-form';
import { createClient } from '../supabase/server';
import { getApiClient } from './client';

export type DepartureDto = components['schemas']['DepartureDto'];
export type BookingDto = components['schemas']['BookingDto'];
export type CheckoutSessionDto = components['schemas']['CheckoutSessionDto'];
type TourDetailDto = components['schemas']['TourDetailDto'];

// API origin (the routes below already include the `/api/v1` prefix).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Authed JSON call to the API using native `fetch` with a **string** body. We deliberately bypass the
 * openapi-fetch client for owner-scoped booking calls: on Vercel, outgoing-fetch tracing clones the
 * request, and a body delivered as a stream (openapi-fetch's Request path) trips undici's
 * "expected non-null body source" — a string body is clone-safe. Reads the Bearer token per call from
 * the server Supabase session; unwraps the `{ data, error }` envelope; throws `ApiRequestError` on non-2xx.
 */
async function authedJson<T>(
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;
  if (!res.ok) {
    throw new ApiRequestError(res.status, json?.error ?? { code: 'UNKNOWN', message: res.statusText });
  }
  return json?.data as T;
}

/** The caller's bookings, newest first (top 50 on the API). Empty on error. */
export async function fetchMyBookings(): Promise<BookingDto[]> {
  try {
    const data = await authedJson<BookingDto[]>('/api/v1/bookings/me', { method: 'GET' });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Create a PENDING booking (`POST /bookings`). Throws `ApiRequestError` on failure. */
export async function createBooking(payload: CreateBookingPayload): Promise<BookingDto> {
  return authedJson<BookingDto>('/api/v1/bookings', { method: 'POST', body: payload });
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
  await authedJson<BookingDto>(`/api/v1/bookings/${encodeURIComponent(code)}/capture`, {
    method: 'POST',
  });
}

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
    return await authedJson<BookingDto>(`/api/v1/bookings/${encodeURIComponent(code)}`, {
      method: 'GET',
    });
  } catch {
    return null;
  }
}
