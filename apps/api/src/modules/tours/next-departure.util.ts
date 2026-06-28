/**
 * Pure helpers for the "next departure" availability shown on tour cards. A tour's seats live on its
 * `TourDeparture` rows; the card surfaces the **soonest open, upcoming** departure (date + seats
 * left). No I/O here so it can be unit-tested directly.
 */

/** The seat columns of a departure row needed to compute availability. */
export interface DepartureSeatRow {
  startDate: Date;
  seatsTotal: number;
  seatsBooked: number;
}

/** Availability summary attached to a tour card / summary DTO. */
export interface NextDepartureInfo {
  /** `YYYY-MM-DD` of the soonest open upcoming departure, or `null` when none is scheduled. */
  nextDepartureDate: string | null;
  /** Seats left on that departure (`seatsTotal - seatsBooked`, floored at 0), or `null` when none. */
  nextDepartureSeatsLeft: number | null;
}

/** Format a `@db.Date` (UTC-midnight) as a `YYYY-MM-DD` string. */
export function toDateOnlyIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Build the availability summary from the soonest open upcoming departure (or `undefined`/`null` when
 * a tour has none — e.g. private/on-request tours). Seats left is clamped at 0 (a paid overbook race
 * never shows negative).
 */
export function nextDepartureInfo(
  soonest?: DepartureSeatRow | null,
): NextDepartureInfo {
  if (!soonest) {
    return { nextDepartureDate: null, nextDepartureSeatsLeft: null };
  }
  return {
    nextDepartureDate: toDateOnlyIso(soonest.startDate),
    nextDepartureSeatsLeft: Math.max(0, soonest.seatsTotal - soonest.seatsBooked),
  };
}
