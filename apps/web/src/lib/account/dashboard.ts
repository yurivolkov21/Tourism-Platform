/**
 * Pure helpers for the account hub dashboard. The page passes the raw `/bookings/me` list + `now`;
 * these derive the headline counts and the soonest active trip. No formatting/colour here (token
 * classes + i18n live in the components).
 */

/** Minimal booking shape the dashboard needs (a structural subset of `BookingDto`). */
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
  /** Active (PAID/PENDING) future trips, soonest first. */
  upcomingTrips: DashboardBooking[];
  /** The soonest active future trip (= `upcomingTrips[0]`), or null. */
  nextTrip: DashboardBooking | null;
}

const ACTIVE = new Set(['PAID', 'PENDING']);

/** Midnight-UTC epoch for a `YYYY-MM-DD` (or ISO) date — date-only compare, no day-boundary drift. */
function dayStart(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? NaN
    : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from `now` until `startDate` (0 = today, negative = past). */
export function daysUntil(startDate: string, now: Date): number {
  const start = dayStart(startDate);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (Number.isNaN(start)) return 0;
  return Math.round((start - today) / 86_400_000);
}

/**
 * Counts + soonest active future trip. `upcoming` = active (PAID/PENDING) trips from today onward;
 * `completed` = PAID trips already departed; `nextTrip` = the soonest upcoming one.
 */
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
      daysUntil(a.departure.startDate, now) -
      daysUntil(b.departure.startDate, now),
  );

  return {
    total: bookings.length,
    upcoming: upcomingTrips.length,
    completed,
    upcomingTrips,
    nextTrip: upcomingTrips[0] ?? null,
  };
}
