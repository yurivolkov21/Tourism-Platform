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
    steps.push({ key: 'paid', label: 'Awaiting payment', at: null, done: false });
  }

  if (b.status === 'REFUNDED') {
    steps.push({ key: 'refunded', label: 'Refunded', at: b.cancelledAt, done: true });
  } else if (b.status === 'CANCELLED') {
    steps.push({ key: 'cancelled', label: 'Cancelled', at: b.cancelledAt, done: true });
  }

  return steps;
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
