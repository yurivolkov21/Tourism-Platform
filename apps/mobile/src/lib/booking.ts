import { ApiRequestError, type components } from '@tourism/core';
import { messages } from '@tourism/i18n';
import type { BadgeTone } from '@tourism/mobile-ui';
import { getApiClient } from './api';
import type { CreateBookingPayload } from './booking-form';

export type BookingDto = components['schemas']['BookingDto'];
export type DepartureDto = components['schemas']['DepartureDto'];
type CheckoutSessionDto = components['schemas']['CheckoutSessionDto'];

/** "Fri, 15 Aug 2026" from a YYYY-MM-DD date (UTC avoids a day-boundary off-by-one). */
export function formatDepartureLabel(isoDate: string): string {
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

/** "07 Jul 2026" — booked-on / compact dates (UTC). */
export function formatBookingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A bookable departure, shaped for the form's picker + live price. */
export interface DepartureOption {
  id: string;
  label: string;
  /** Effective per-person price (departure override, else the tour base price). */
  price: number;
  seatsLeft: number;
}

/** Maps open departures → picker options (same shape as web's toDepartureOptions). */
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

export interface BookingStatusMeta {
  label: string;
  tone: BadgeTone;
}

// Same status→tone mapping as web's bookingStatusTone (my-bookings.ts).
const STATUS_TONES: Record<string, BadgeTone> = {
  PAID: 'success',
  PENDING: 'warning',
  CANCELLED: 'muted',
  REFUNDED: 'destructive',
  PARTIALLY_REFUNDED: 'destructive',
};

export function bookingStatusMeta(status: string): BookingStatusMeta {
  return {
    label: messages.booking.list.status[status] ?? status,
    tone: STATUS_TONES[status] ?? 'muted',
  };
}

/** "2 adults · 1 child" via the shared web copy helpers. */
export function partyLine(numAdults: number, numChildren: number): string {
  const parts = [messages.booking.page.adultsLine(numAdults)];
  if (numChildren > 0)
    parts.push(messages.booking.page.childrenLine(numChildren));
  return parts.join(' · ');
}

export interface BookingVm {
  code: string;
  status: BookingDto['status'];
  statusMeta: BookingStatusMeta;
  tourTitle: string;
  tourSlug: string;
  departureLabel: string;
  /** Raw YYYY-MM-DD (UTC) departure date — for ranking upcoming trips. */
  departureDate: string;
  bookedOn: string;
  party: string;
  totalAmount: number;
  currency: string;
  paymentProvider: BookingDto['paymentProvider'];
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
  cancellationStatus?: 'REQUESTED' | 'REFUNDED' | 'DENIED';
  refundedAmount?: number;
}

export function toBookingVm(dto: BookingDto): BookingVm {
  return {
    code: dto.code,
    status: dto.status,
    statusMeta: bookingStatusMeta(dto.status),
    tourTitle: dto.tour.title,
    tourSlug: dto.tour.slug,
    departureLabel: formatDepartureLabel(dto.departure.startDate),
    departureDate: dto.departure.startDate,
    bookedOn: formatBookingDate(dto.createdAt),
    party: partyLine(dto.numAdults, dto.numChildren),
    totalAmount: Number(dto.totalAmount),
    currency: dto.currency,
    paymentProvider: dto.paymentProvider,
    contactName: dto.contactName,
    contactEmail: dto.contactEmail,
    contactPhone: dto.contactPhone ?? undefined,
    specialRequests: dto.specialRequests ?? undefined,
    cancellationStatus: dto.cancellationRequest?.status,
    refundedAmount:
      dto.refundedAmount != null ? Number(dto.refundedAmount) : undefined,
  };
}

/** Friendly EN for a booking/API failure (`ApiRequestError.code` → web copy). */
export function bookingErrorMessage(error: unknown): string {
  const errors = messages.booking.errors as Record<string, string>;
  if (error instanceof ApiRequestError && errors[error.code])
    return errors[error.code];
  return errors['generic'];
}

/**
 * Open departures for a tour (public). Throws on failure so the booking form
 * can tell "no departures" apart from "couldn't load departures" (a swallowed
 * network error here would silently dead-end the money path).
 */
export async function fetchTourDepartures(
  slug: string,
): Promise<DepartureDto[]> {
  const { data } = await getApiClient().GET('/api/v1/tours/{slug}/departures', {
    params: { path: { slug }, query: { status: 'OPEN' } },
  });
  return (data as unknown as { data?: DepartureDto[] } | undefined)?.data ?? [];
}

/** The caller's bookings, newest first (top 50 on the API). Throws on failure. */
export async function fetchMyBookings(): Promise<BookingVm[]> {
  const { data } = await getApiClient().GET('/api/v1/bookings/me');
  const list =
    (data as unknown as { data?: BookingDto[] } | undefined)?.data ?? [];
  return list.map(toBookingVm);
}

/** One booking by code (owner-only; the API collapses forbidden to 404 → null). */
export async function fetchBooking(code: string): Promise<BookingVm | null> {
  try {
    const { data } = await getApiClient().GET('/api/v1/bookings/{code}', {
      params: { path: { code } },
    });
    const dto = (data as unknown as { data?: BookingDto } | undefined)?.data;
    return dto ? toBookingVm(dto) : null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

async function postBooking(payload: CreateBookingPayload): Promise<BookingDto> {
  // The generated CreateBookingDto marks numChildren as required (@default 0),
  // while the form payload omits it when 0 — make the default explicit.
  const { data } = await getApiClient().POST('/api/v1/bookings', {
    body: { numChildren: 0, ...payload },
  });
  const dto = (data as unknown as { data?: BookingDto } | undefined)?.data;
  if (!dto) throw new Error('empty booking response');
  return dto;
}

/**
 * Create a PENDING booking. The first authed write can race the user mirror —
 * re-sync once and retry, exactly like web's createBookingWithSync (which also
 * treats a plain 401 as the unmirrored-user case, not just USER_NOT_SYNCED).
 */
export async function createBooking(
  payload: CreateBookingPayload,
): Promise<BookingDto> {
  try {
    return await postBooking(payload);
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (error.code === 'USER_NOT_SYNCED' || error.status === 401)
    ) {
      await getApiClient().POST('/api/v1/auth/sync', { body: {} });
      return postBooking(payload);
    }
    throw error;
  }
}

/** Start a hosted-checkout session for a PENDING booking → the gateway URL. */
export async function startCheckout(code: string): Promise<string> {
  const { data } = await getApiClient().POST(
    '/api/v1/bookings/{code}/checkout',
    {
      params: { path: { code } },
    },
  );
  const dto = (data as unknown as { data?: CheckoutSessionDto } | undefined)
    ?.data;
  if (!dto?.checkoutUrl) throw new Error('empty checkout response');
  return dto.checkoutUrl;
}

/** Capture an approved PayPal order. Idempotent on the API (safe to race web). */
export async function captureBooking(code: string): Promise<void> {
  await getApiClient().POST('/api/v1/bookings/{code}/capture', {
    params: { path: { code } },
  });
}

/** Cancel the caller's own PENDING booking. */
export async function cancelBooking(code: string): Promise<void> {
  await getApiClient().POST('/api/v1/bookings/{code}/cancel', {
    params: { path: { code } },
  });
}

/** Request cancellation/refund of a PAID booking (admin processes it). */
export async function requestCancellation(
  code: string,
  reason?: string,
): Promise<void> {
  const trimmed = reason?.trim();
  await getApiClient().POST('/api/v1/bookings/{code}/cancellation-request', {
    params: { path: { code } },
    body: trimmed ? { reason: trimmed } : {},
  });
}
