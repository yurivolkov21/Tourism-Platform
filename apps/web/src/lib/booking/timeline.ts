/**
 * Order-tracking timeline for a booking (Shopee-style progress rail): Booked → Paid → Departure →
 * Completed, with the reached steps filled in and the rest greyed out. Every step is derived from
 * data the API already returns — no new fields, and nothing is claimed that the DTO can't prove
 * (see the CANCELLED case below).
 */

import { dateOnly } from './dates';

export type TimelineStepKey =
  | 'booked'
  | 'paid'
  | 'departure'
  | 'completed'
  | 'cancelled'
  | 'refunded';

/** `stopped` = a terminal (cancelled/refunded) end-cap; the rail shows no steps past it. */
export type TimelineStepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface TimelineStep {
  key: TimelineStepKey;
  state: TimelineStepState;
  /** ISO date backing the step, when the DTO has one (steps with no timestamp omit it). */
  date?: string;
}

/** The slice of `BookingDto` the timeline reads. */
export interface TimelineInput {
  status: string;
  createdAt: string;
  departure: { startDate: string; endDate: string };
}

/** `YYYY-MM-DD` in UTC — day-level comparison avoids a timezone off-by-one on departure dates. */
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildBookingTimeline(
  booking: TimelineInput,
  now: Date = new Date(),
): TimelineStep[] {
  const booked: TimelineStep = {
    key: 'booked',
    state: 'done',
    date: booking.createdAt,
  };

  // A CANCELLED booking may have been self-cancelled while still PENDING — the status alone does
  // not prove a payment ever landed, so the rail stops right after "booked". A refund, on the
  // other hand, is only possible on a captured payment, so `paid` is honest there.
  if (booking.status === 'CANCELLED') {
    return [booked, { key: 'cancelled', state: 'stopped' }];
  }
  if (
    booking.status === 'REFUNDED' ||
    booking.status === 'PARTIALLY_REFUNDED'
  ) {
    return [
      booked,
      { key: 'paid', state: 'done' },
      { key: 'refunded', state: 'stopped' },
    ];
  }

  // Both sides normalised to `YYYY-MM-DD` before comparing — the API sends full ISO datetimes, and
  // "2026-09-15" >= "2026-09-15T00:00:00.000Z" is false, which would hide the departure day itself.
  const today = utcDay(now);
  const started = today >= dateOnly(booking.departure.startDate);
  const ended = today > dateOnly(booking.departure.endDate);
  const paid = booking.status === 'PAID';

  return [
    booked,
    { key: 'paid', state: paid ? 'done' : 'current' },
    {
      key: 'departure',
      state: !paid ? 'upcoming' : started ? 'done' : 'current',
      date: booking.departure.startDate,
    },
    {
      key: 'completed',
      state: !paid || !started ? 'upcoming' : ended ? 'done' : 'current',
      date: booking.departure.endDate,
    },
  ];
}
