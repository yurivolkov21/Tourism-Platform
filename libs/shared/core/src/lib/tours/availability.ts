/**
 * Pure: turn a tour's next-departure fields (from the API) into the card availability badge state.
 * Deliberately soft — we never render "sold out" (seats reflect only PAID bookings + can be ISR-stale,
 * and a full nearest departure may still have later openings), so a 0-seat nearest departure just
 * shows the date and lets the detail page tell the full story.
 */

/** Below this many seats on the nearest departure, show the urgency badge. */
export const LOW_SEATS_THRESHOLD = 5;

export type TourAvailability =
  | { kind: 'onRequest' }
  | { kind: 'low'; seatsLeft: number }
  | { kind: 'next'; date: string };

export function tourAvailability(
  nextDepartureDate: string | null | undefined,
  nextDepartureSeatsLeft: number | null | undefined,
  threshold: number = LOW_SEATS_THRESHOLD,
): TourAvailability {
  if (!nextDepartureDate) return { kind: 'onRequest' };
  const seats = nextDepartureSeatsLeft ?? 0;
  if (seats > 0 && seats <= threshold) return { kind: 'low', seatsLeft: seats };
  return { kind: 'next', date: nextDepartureDate };
}

/** Short, locale-stable label for a `YYYY-MM-DD` date, e.g. "15 Aug". */
export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
