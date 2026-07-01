import type { components } from '@tourism/core';

export type BookingStatus = components['schemas']['BookingDto']['status'];

/** Badge variant names available in `@tourism/ui`'s `Badge`. */
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

const STATUS_META: Record<BookingStatus, StatusMeta> = {
  PENDING: { label: 'Pending payment', variant: 'secondary' },
  PAID: { label: 'Paid', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
  REFUNDED: { label: 'Refunded', variant: 'destructive' },
};

/** Friendly label + badge variant for a booking lifecycle status. */
export function bookingStatusMeta(status: BookingStatus): StatusMeta {
  return STATUS_META[status];
}

/** Only a PAID booking can be refunded (Stripe refund + seat release). */
export function canRefund(status: BookingStatus): boolean {
  return status === 'PAID';
}

/**
 * Formats a Prisma `Decimal` string (e.g. "99.00") in its ISO currency. Falls back to
 * "amount currency" when the value isn't a finite number so we never render "NaN".
 */
export function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** "2 adults, 1 child" — pluralized; children omitted when zero. */
export function formatGuests(numAdults: number, numChildren: number): string {
  const adults = `${numAdults} ${numAdults === 1 ? 'adult' : 'adults'}`;
  if (numChildren <= 0) return adults;
  const children = `${numChildren} ${numChildren === 1 ? 'child' : 'children'}`;
  return `${adults}, ${children}`;
}
