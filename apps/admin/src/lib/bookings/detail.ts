import type { components } from '@tourism/core';

// Re-exported from the shared util so existing imports (`from './detail'`) keep working.
export { formatRelativeTime } from '../relative-time';

export type AdminBookingDetail = components['schemas']['AdminBookingDetailDto'];

/** One node on the booking lifecycle timeline. `done` distinguishes reached vs pending. */
export interface TimelineStep {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
}

/** Fields the timeline reads — a narrow slice for easy testing. */
type TimelineInput = Pick<
  AdminBookingDetail,
  'status' | 'createdAt' | 'paidAt' | 'cancelledAt'
>;

/**
 * Builds the lifecycle timeline from the booking's timestamps + status. Only events that actually
 * happened are marked `done`; a PENDING booking shows an "Awaiting payment" step that is not yet
 * done. A booking cancelled before payment (`paidAt` null) shows no Paid step.
 */
export function buildBookingTimeline(b: TimelineInput): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: 'created', label: 'Created', at: b.createdAt, done: true },
  ];

  if (b.paidAt) {
    steps.push({ key: 'paid', label: 'Paid', at: b.paidAt, done: true });
  } else if (b.status === 'PENDING') {
    steps.push({
      key: 'paid',
      label: 'Awaiting payment',
      at: null,
      done: false,
    });
  }

  if (b.status === 'REFUNDED') {
    steps.push({
      key: 'refunded',
      label: 'Refunded',
      at: b.cancelledAt,
      done: true,
    });
  } else if (b.status === 'CANCELLED') {
    steps.push({
      key: 'cancelled',
      label: 'Cancelled',
      at: b.cancelledAt,
      done: true,
    });
  }

  return steps;
}

export interface BookingBreakdownRow {
  label: string;
  amount: number;
}

export interface BookingBreakdown {
  /** Uniform per-traveller price (cents-rounded), for display context only. */
  perTraveller: number;
  rows: BookingBreakdownRow[];
  total: number;
}

/** Fields the breakdown reads — a narrow slice for easy testing. */
type BreakdownInput = Pick<
  AdminBookingDetail,
  'numAdults' | 'numChildren' | 'totalAmount' | 'currency'
>;

/** "2 adults" / "1 child" — pluralized. */
function guestGroupLabel(count: number, noun: 'adult' | 'child'): string {
  const plural = noun === 'child' ? 'children' : 'adults';
  return `${count} ${count === 1 ? noun : plural}`;
}

/**
 * Itemizes a booking's total across its guests, using a UNIFORM per-guest split derived only from
 * the booking's own `totalAmount` snapshot — never current tour/departure prices (those drift after
 * later price edits). Guards: zero/negative guest count or an unparsable total both return `null`
 * (no card rendered). All arithmetic is done in integer cents so rows always sum exactly to the
 * total; any rounding remainder is absorbed by the LAST row rather than spread evenly, so cents
 * never drift.
 */
export function bookingBreakdown(
  detail: BreakdownInput,
): BookingBreakdown | null {
  const guests = detail.numAdults + detail.numChildren;
  if (guests <= 0) return null;

  const trimmedTotal = detail.totalAmount.trim();
  const total = Number(trimmedTotal);
  if (trimmedTotal === '' || !Number.isFinite(total) || total <= 0) return null;

  const totalCents = Math.round(total * 100);
  const perTravellerCents = Math.floor(totalCents / guests);

  const groups: { label: string; count: number }[] = [];
  if (detail.numAdults > 0) {
    groups.push({
      label: guestGroupLabel(detail.numAdults, 'adult'),
      count: detail.numAdults,
    });
  }
  if (detail.numChildren > 0) {
    groups.push({
      label: guestGroupLabel(detail.numChildren, 'child'),
      count: detail.numChildren,
    });
  }

  const rows: BookingBreakdownRow[] = groups.map((g) => ({
    label: g.label,
    amount: (perTravellerCents * g.count) / 100,
  }));

  // Remainder-adjust the LAST row so the rows always sum exactly to totalCents.
  const allocatedCents = rows
    .slice(0, -1)
    .reduce((sum, r) => sum + Math.round(r.amount * 100), 0);
  const lastRow = rows[rows.length - 1];
  if (lastRow) lastRow.amount = (totalCents - allocatedCents) / 100;

  return {
    perTraveller: perTravellerCents / 100,
    rows,
    total: totalCents / 100,
  };
}

/**
 * Stripe dashboard deep-link for a captured PaymentIntent — only for STRIPE bookings with a captured
 * id; null otherwise (PayPal has no equivalent one-click link here).
 */
export function stripePaymentUrl(
  providerPaymentId: string | null,
  provider: string,
): string | null {
  if (provider !== 'STRIPE' || !providerPaymentId) return null;
  return `https://dashboard.stripe.com/payments/${providerPaymentId}`;
}
