/**
 * Normalizes an API date value to a bare `YYYY-MM-DD`. The departure date columns are `@db.Date` but
 * Prisma serializes them as full ISO datetimes (`2026-08-15T00:00:00.000Z`); we only want the date for
 * display and for `<input type="date">` (which rejects a full ISO string). Kept dependency-free so both
 * Server Components and the client form can import it.
 */
export function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

/**
 * True when a departure's start date is strictly before today (UTC calendar-date compare, mirroring
 * the API's `DEPARTURE_IN_PAST` / `DEPARTURE_DEPARTED` guards). Same-day returns false — a departure is
 * still bookable on its start date (walk-in). Used to mark "Departed" rows in the admin list; accepts
 * an ISO datetime or a bare `YYYY-MM-DD` (only the date part is compared).
 */
export function isDeparturePast(startDate: string): boolean {
  const todayUtc = new Date().toISOString().slice(0, 10);
  return startDate.slice(0, 10) < todayUtc;
}
