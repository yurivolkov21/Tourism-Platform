import {
  TOUR_CARD_IMAGE_FALLBACK,
  daysUntil,
  summarizeBookings,
  type components,
} from '@tourism/core';

import { fetchJsonWithRetry } from '../api/fetch-json';
import { fetchMyBookings } from '../api/bookings';
import type { TripBooking } from './types';

type BookingDto = components['schemas']['BookingDto'];
type TourDetailDto = components['schemas']['TourDetailDto'];

export function mapBookingDto(dto: BookingDto, now: Date): TripBooking {
  const days = daysUntil(dto.departure.startDate, now);
  const active = dto.status === 'PAID' || dto.status === 'PENDING';
  return {
    code: dto.code,
    status: dto.status,
    tourSlug: dto.tour.slug,
    tourTitle: dto.tour.title,
    destination: '',
    image: TOUR_CARD_IMAGE_FALLBACK,
    departureDate: dto.departure.startDate,
    bookedOn: dto.createdAt,
    numAdults: dto.numAdults,
    numChildren: dto.numChildren,
    totalAmount: Number(dto.totalAmount),
    currency: dto.currency,
    daysUntilDeparture: active && days >= 0 ? days : null,
    contactName: dto.contactName,
    contactEmail: dto.contactEmail,
    contactPhone: dto.contactPhone ?? undefined,
    specialRequests: dto.specialRequests ?? undefined,
    paymentProvider: dto.paymentProvider,
  };
}

async function fetchTourMeta(
  slug: string,
): Promise<{ image: string; destination: string }> {
  try {
    const json = await fetchJsonWithRetry<{ data?: TourDetailDto }>(
      `/api/v1/tours/${encodeURIComponent(slug)}`,
      'tour-meta',
    );
    const dto = json.data;
    if (!dto) {
      return { image: TOUR_CARD_IMAGE_FALLBACK, destination: '' };
    }
    const primary =
      dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
    const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
    return {
      image: hero?.url ?? TOUR_CARD_IMAGE_FALLBACK,
      destination: primary?.destination.name ?? '',
    };
  } catch {
    return { image: TOUR_CARD_IMAGE_FALLBACK, destination: '' };
  }
}

export async function enrichTripBookings(
  bookings: TripBooking[],
): Promise<TripBooking[]> {
  const slugs = [...new Set(bookings.map((b) => b.tourSlug))];
  const metaEntries = await Promise.all(
    slugs.map(async (slug) => [slug, await fetchTourMeta(slug)] as const),
  );
  const metaBySlug = new Map(metaEntries);
  return bookings.map((booking) => {
    const meta = metaBySlug.get(booking.tourSlug);
    if (!meta) return booking;
    return {
      ...booking,
      image: meta.image,
      destination: meta.destination,
    };
  });
}

export function splitTripBookings(
  bookings: TripBooking[],
  now: Date,
): { nextTrip: TripBooking | null; upcoming: TripBooking[]; past: TripBooking[] } {
  const dashboard = bookings.map((b) => ({
    code: b.code,
    status: b.status,
    tour: { slug: b.tourSlug, title: b.tourTitle },
    departure: { startDate: b.departureDate },
  }));
  const stats = summarizeBookings(dashboard, now);
  const upcomingCodes = new Set(stats.upcomingTrips.map((b) => b.code));
  const byCode = new Map(bookings.map((b) => [b.code, b]));
  const upcoming = stats.upcomingTrips
    .map((b) => byCode.get(b.code))
    .filter((b): b is TripBooking => b != null);
  const past = bookings.filter((b) => !upcomingCodes.has(b.code));
  const nextTrip = stats.nextTrip ? (byCode.get(stats.nextTrip.code) ?? null) : null;
  return { nextTrip, upcoming, past };
}

export async function loadTripBookings(now = new Date()): Promise<TripBooking[]> {
  const dtos = await fetchMyBookings();
  const mapped = dtos.map((dto) => mapBookingDto(dto, now));
  return enrichTripBookings(mapped);
}
