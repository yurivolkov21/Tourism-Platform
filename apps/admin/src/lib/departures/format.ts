/**
 * Normalizes an API date value to a bare `YYYY-MM-DD`. The departure date columns are `@db.Date` but
 * Prisma serializes them as full ISO datetimes (`2026-08-15T00:00:00.000Z`); we only want the date for
 * display and for `<input type="date">` (which rejects a full ISO string). Kept dependency-free so both
 * Server Components and the client form can import it.
 */
export function toDateOnly(value: string): string {
  return value.slice(0, 10);
}
