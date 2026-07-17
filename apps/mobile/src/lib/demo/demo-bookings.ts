/**
 * Demo bookings for the Trips tab, derived from the **live tour catalog** so
 * titles/images/destinations/prices match real tours in the app. Booking-only
 * fields (status, dates, travellers, contact) are deterministic samples until
 * the real `/bookings/me` wiring lands (see `../bookings/trip-bookings.ts`).
 */
import { useCallback, useEffect, useState } from 'react';

import { TOUR_CARD_IMAGE_FALLBACK, type TourCardData } from '@tourism/core';

import { fetchTourCards } from '../api/tours';
import type { TripBooking, TripBookingStatus } from '../bookings/types';

const DEMO_CONTACT = {
  contactName: 'Alex Nguyen',
  contactEmail: 'alex.nguyen@example.com',
  contactPhone: '+84 90 123 4567',
} as const;

/** Deterministic sample plan applied to the first catalog tours, in order. */
const BOOKING_PLAN: ReadonlyArray<{
  status: TripBookingStatus;
  /** Departure offset from "now", in days (negative = past trip). */
  departureInDays: number;
  numAdults: number;
  numChildren: number;
  paymentProvider: TripBooking['paymentProvider'];
  specialRequests?: string;
}> = [
  {
    status: 'PAID',
    departureInDays: 44,
    numAdults: 2,
    numChildren: 0,
    paymentProvider: 'STRIPE',
  },
  {
    status: 'PENDING',
    departureInDays: 66,
    numAdults: 2,
    numChildren: 1,
    paymentProvider: 'PAYPAL',
    specialRequests: 'Vegetarian meals for 1 adult.',
  },
  {
    status: 'PAID',
    departureInDays: -30,
    numAdults: 2,
    numChildren: 0,
    paymentProvider: 'STRIPE',
  },
  {
    status: 'PAID',
    departureInDays: -120,
    numAdults: 2,
    numChildren: 1,
    paymentProvider: 'STRIPE',
  },
];

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Readable, deterministic booking code from the tour slug (demo only). */
export function demoBookingCode(slug: string): string {
  const initials = slug
    .split('-')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 6);
  return `NXR-${initials || 'TOUR'}`;
}

/** Build sample bookings from real catalog tours. Pure and deterministic for a fixed `now`. */
export function buildDemoBookings(
  tours: readonly TourCardData[],
  now = new Date(),
): TripBooking[] {
  const seen = new Set<string>();
  return tours.slice(0, BOOKING_PLAN.length).map((tour, index) => {
    const plan = BOOKING_PLAN[index];
    let code = demoBookingCode(tour.slug);
    if (seen.has(code)) code = `${code}${index}`;
    seen.add(code);

    const upcoming = plan.departureInDays >= 0;
    const perPerson = tour.basePrice;
    const totalAmount = Math.round(
      perPerson * (plan.numAdults + plan.numChildren * 0.5),
    );

    return {
      code,
      status: plan.status,
      tourSlug: tour.slug,
      tourTitle: tour.title,
      destination: tour.destination,
      image: tour.image ?? TOUR_CARD_IMAGE_FALLBACK,
      departureDate: addDays(now, plan.departureInDays),
      bookedOn: addDays(now, plan.departureInDays - 40),
      numAdults: plan.numAdults,
      numChildren: plan.numChildren,
      totalAmount,
      currency: tour.currency,
      daysUntilDeparture: upcoming ? plan.departureInDays : null,
      specialRequests: plan.specialRequests,
      paymentProvider: plan.paymentProvider,
      ...DEMO_CONTACT,
    };
  });
}

export function getNextTrip(bookings: TripBooking[]): TripBooking | null {
  const upcoming = bookings
    .filter((b) => b.daysUntilDeparture != null && b.daysUntilDeparture >= 0)
    .filter((b) => b.status === 'PAID' || b.status === 'PENDING')
    .sort((a, b) => (a.daysUntilDeparture ?? 0) - (b.daysUntilDeparture ?? 0));
  return upcoming[0] ?? null;
}

export function splitBookings(bookings: TripBooking[]): {
  upcoming: TripBooking[];
  past: TripBooking[];
} {
  const upcoming = bookings.filter(
    (b) =>
      b.daysUntilDeparture != null &&
      b.daysUntilDeparture >= 0 &&
      (b.status === 'PAID' || b.status === 'PENDING'),
  );
  const past = bookings
    .filter((b) => !upcoming.includes(b))
    .sort((a, b) => b.departureDate.localeCompare(a.departureDate));
  return { upcoming, past };
}

// Module-level cache so the Trips tab, the tab-bar badge and the detail screen
// share one catalog fetch per app session.
let cache: TripBooking[] | null = null;
let inflight: Promise<TripBooking[]> | null = null;

async function loadDemoBookings(refresh = false): Promise<TripBooking[]> {
  if (refresh) {
    cache = null;
    inflight = null;
  }
  if (cache) return cache;
  inflight ??= (async () => {
    try {
      const tours = await fetchTourCards({ pageSize: 10 });
      cache = buildDemoBookings(tours);
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function getDemoBookingByCode(
  code: string,
): Promise<TripBooking | undefined> {
  const bookings = await loadDemoBookings();
  return bookings.find((b) => b.code === code);
}

export function useDemoBookings() {
  const [bookings, setBookings] = useState<TripBooking[]>(cache ?? []);
  const [loading, setLoading] = useState(cache == null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (options: { refresh?: boolean } = {}) => {
    const { refresh = false } = options;
    if (refresh) {
      setRefreshing(true);
    } else if (cache == null) {
      setLoading(true);
    }
    setError(false);
    try {
      setBookings(await loadDemoBookings(refresh));
    } catch (err) {
      if (__DEV__) {
        console.warn('[trips] demo bookings load failed:', err);
      }
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { bookings, loading, refreshing, error, load };
}
