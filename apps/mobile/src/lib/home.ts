import type { BookingVm } from './booking';

/** Statuses that are no longer a live upcoming trip. */
const NON_TRIP_STATUSES = new Set(['CANCELLED', 'REFUNDED']);

/**
 * The soonest upcoming trip: the nearest departure on or after `todayIso`
 * (a YYYY-MM-DD UTC date, passed in for testability) that is still a live
 * booking. Returns null when nothing qualifies.
 */
export function selectUpcomingTrip(
  bookings: BookingVm[],
  todayIso: string,
): BookingVm | null {
  const upcoming = bookings
    .filter(
      (b) => !NON_TRIP_STATUSES.has(b.status) && b.departureDate >= todayIso,
    )
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  return upcoming[0] ?? null;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Maps a 0-23 hour to a greeting bucket. */
export function timeGreetingKey(hour: number): TimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** First whitespace-delimited token of a full name ('' when blank). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}
