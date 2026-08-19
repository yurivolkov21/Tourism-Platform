/**
 * "N days until you go" for a booked departure. Day-level UTC math (same boundary rule as
 * `timeline.ts`) so a traveller in any timezone sees the same number the departure date implies —
 * never an off-by-one from local midnight.
 */

import { dateOnly } from './dates';

export type CountdownKind = 'upcoming' | 'today' | 'ongoing' | 'past';

export interface Countdown {
  kind: CountdownKind;
  /** Whole days remaining; 0 for every non-`upcoming` kind. */
  days: number;
}

const DAY_MS = 86_400_000;

/** UTC midnight for a date string (plain or full ISO) or for the day a `Date` falls on. */
function utcMidnight(value: string | Date): number {
  const iso =
    typeof value === 'string'
      ? dateOnly(value)
      : value.toISOString().slice(0, 10);
  return Date.parse(`${iso}T00:00:00.000Z`);
}

/** Inclusive length of the booked departure in days — a same-day tour is 1, not 0. */
export function tripLengthDays(startDate: string, endDate: string): number {
  const span = Math.round(
    (utcMidnight(endDate) - utcMidnight(startDate)) / DAY_MS,
  );
  return Math.max(1, span + 1);
}

export function daysUntilDeparture(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): Countdown {
  const today = utcMidnight(now);
  const start = utcMidnight(startDate);
  const end = utcMidnight(endDate);

  if (today < start) {
    return { kind: 'upcoming', days: Math.round((start - today) / DAY_MS) };
  }
  if (today === start) return { kind: 'today', days: 0 };
  if (today <= end) return { kind: 'ongoing', days: 0 };
  return { kind: 'past', days: 0 };
}
