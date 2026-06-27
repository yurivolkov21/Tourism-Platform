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
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
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
  let upcoming = 0;
  let completed = 0;
  let nextTrip: DashboardBooking | null = null;

  for (const b of bookings) {
    const days = daysUntil(b.departure.startDate, now);
    const isFuture = days >= 0;
    if (isFuture && ACTIVE.has(b.status)) {
      upcoming += 1;
      if (!nextTrip || days < daysUntil(nextTrip.departure.startDate, now)) {
        nextTrip = b;
      }
    } else if (!isFuture && b.status === 'PAID') {
      completed += 1;
    }
  }

  return { total: bookings.length, upcoming, completed, nextTrip };
}
