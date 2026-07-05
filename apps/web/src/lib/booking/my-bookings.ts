/**
 * Pure helpers for the "My bookings" list (`/account/bookings`). Status labels/field copy live in
 * `@tourism/i18n`; these cover the formatting + the status→tone mapping (token classes only — no hex).
 */

/** "24 Jul 2026" from a `YYYY-MM-DD` (or ISO) date, UTC to avoid a day-boundary off-by-one. */
export function formatTripDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Tinted Badge classes per booking status. Token-only (success/warning/muted/destructive) so the
// status colours stay theme-aware and pass the no-hex gate.
const STATUS_TONES: Record<string, string> = {
  PAID: 'border-transparent bg-success/15 text-success',
  PENDING: 'border-transparent bg-warning/15 text-warning',
  CANCELLED: 'border-transparent bg-muted text-muted-foreground',
  REFUNDED: 'border-transparent bg-destructive/15 text-destructive',
  PARTIALLY_REFUNDED: 'border-transparent bg-destructive/15 text-destructive',
};

/** Badge className for a booking status; unknown statuses fall back to the muted (cancelled) tone. */
export function bookingStatusTone(status: string): string {
  return STATUS_TONES[status] ?? STATUS_TONES.CANCELLED;
}
