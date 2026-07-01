import type { components } from '@tourism/core';

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
    steps.push({ key: 'paid', label: 'Awaiting payment', at: null, done: false });
  }

  if (b.status === 'REFUNDED') {
    steps.push({ key: 'refunded', label: 'Refunded', at: b.cancelledAt, done: true });
  } else if (b.status === 'CANCELLED') {
    steps.push({ key: 'cancelled', label: 'Cancelled', at: b.cancelledAt, done: true });
  }

  return steps;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const RELATIVE_CUTOFF_DAYS = 30;

/**
 * Human "time ago" for a timestamp — "just now" / "5 min ago" / "3 hours ago" / "2 days ago". Past
 * ~30 days it falls back to an absolute date. `now` is injectable for deterministic tests. Returns
 * an empty string for an unparseable input.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';

  const sec = Math.round((now.getTime() - then.getTime()) / 1000);
  if (sec < 45) return 'just now';

  const min = Math.round(sec / MINUTE);
  if (min < 60) return `${min} min ago`;

  const hr = Math.round(sec / HOUR);
  if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;

  const day = Math.round(sec / DAY);
  if (day <= RELATIVE_CUTOFF_DAYS) return `${day} ${day === 1 ? 'day' : 'days'} ago`;

  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
