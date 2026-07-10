/**
 * Pure helpers for booking lists (account dashboard + mobile Trips tab).
 * Input is a structural subset of `BookingDto`.
 */

export interface DashboardBooking {
  code: string;
  status: string;
  tour: { slug: string; title: string };
  departure: { startDate: string; endDate?: string };
}

export interface AccountStats {
  total: number;
  upcoming: number;
  completed: number;
  upcomingTrips: DashboardBooking[];
  nextTrip: DashboardBooking | null;
}

const ACTIVE = new Set(['PAID', 'PENDING']);

function dayStart(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? NaN
    : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from `now` until `startDate` (0 = today, negative = past). */
export function daysUntil(startDate: string, now: Date): number {
  const start = dayStart(startDate);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (Number.isNaN(start)) return 0;
  return Math.round((start - today) / 86_400_000);
}

export function summarizeBookings(
  bookings: readonly DashboardBooking[],
  now: Date,
): AccountStats {
  let completed = 0;
  const upcomingTrips: DashboardBooking[] = [];

  for (const b of bookings) {
    const days = daysUntil(b.departure.startDate, now);
    if (days >= 0 && ACTIVE.has(b.status)) {
      upcomingTrips.push(b);
    } else if (days < 0 && b.status === 'PAID') {
      completed += 1;
    }
  }

  upcomingTrips.sort(
    (a, b) =>
      daysUntil(a.departure.startDate, now) - daysUntil(b.departure.startDate, now),
  );

  return {
    total: bookings.length,
    upcoming: upcomingTrips.length,
    completed,
    upcomingTrips,
    nextTrip: upcomingTrips[0] ?? null,
  };
}
