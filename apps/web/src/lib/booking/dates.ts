/**
 * Departure-date normaliser.
 *
 * The OpenAPI schema documents `startDate`/`endDate` as `format: date` ("2026-09-15"), but the API
 * actually serialises them as full ISO datetimes ("2026-09-15T00:00:00.000Z") — Prisma hands back a
 * `Date` and Nest JSON-encodes it whole. Every consumer that does date math or string comparison on
 * these fields must go through here first; feeding the raw value to `Date.parse('<v>T00:00:00Z')`
 * yields `NaN`, and comparing it against a plain `YYYY-MM-DD` mis-orders the departure day itself.
 */

/** The `YYYY-MM-DD` part of a plain date or a full ISO datetime. */
export function dateOnly(value: string): string {
  return value.slice(0, 10);
}
