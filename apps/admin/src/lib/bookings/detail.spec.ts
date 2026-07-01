import { buildBookingTimeline, formatRelativeTime, stripePaymentUrl } from './detail';

const base = {
  status: 'PENDING' as const,
  createdAt: '2026-06-30T08:00:00.000Z',
  paidAt: null as string | null,
  cancelledAt: null as string | null,
};

describe('buildBookingTimeline', () => {
  test('PENDING → Created (done) + Awaiting payment (not done)', () => {
    const steps = buildBookingTimeline(base);
    expect(steps.map((s) => [s.key, s.done])).toEqual([
      ['created', true],
      ['paid', false],
    ]);
  });

  test('PAID → Created + Paid, both done with timestamps', () => {
    const steps = buildBookingTimeline({
      ...base,
      status: 'PAID',
      paidAt: '2026-07-01T10:00:00.000Z',
    });
    expect(steps).toEqual([
      { key: 'created', label: 'Created', at: '2026-06-30T08:00:00.000Z', done: true },
      { key: 'paid', label: 'Paid', at: '2026-07-01T10:00:00.000Z', done: true },
    ]);
  });

  test('CANCELLED from pending (never paid) → Created + Cancelled, no paid step', () => {
    const steps = buildBookingTimeline({
      ...base,
      status: 'CANCELLED',
      cancelledAt: '2026-07-01T09:00:00.000Z',
    });
    expect(steps.map((s) => s.key)).toEqual(['created', 'cancelled']);
  });

  test('REFUNDED → Created + Paid + Refunded (refund time from cancelledAt)', () => {
    const steps = buildBookingTimeline({
      status: 'REFUNDED',
      createdAt: '2026-06-30T08:00:00.000Z',
      paidAt: '2026-07-01T10:00:00.000Z',
      cancelledAt: '2026-07-02T09:00:00.000Z',
    });
    expect(steps.map((s) => s.key)).toEqual(['created', 'paid', 'refunded']);
    expect(steps[2].at).toBe('2026-07-02T09:00:00.000Z');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-10T12:00:00.000Z');

  test('under ~45s → "just now"', () => {
    expect(formatRelativeTime('2026-07-10T11:59:30.000Z', now)).toBe('just now');
  });

  test('minutes and hours', () => {
    expect(formatRelativeTime('2026-07-10T11:55:00.000Z', now)).toBe('5 min ago');
    expect(formatRelativeTime('2026-07-10T09:00:00.000Z', now)).toBe('3 hours ago');
    expect(formatRelativeTime('2026-07-10T11:00:00.000Z', now)).toBe('1 hour ago');
  });

  test('days', () => {
    expect(formatRelativeTime('2026-07-08T12:00:00.000Z', now)).toBe('2 days ago');
    expect(formatRelativeTime('2026-07-09T12:00:00.000Z', now)).toBe('1 day ago');
  });

  test('older than ~30 days → absolute date', () => {
    expect(formatRelativeTime('2026-05-01T12:00:00.000Z', now)).toBe('1 May 2026');
  });

  test('invalid input → empty string', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});

describe('stripePaymentUrl', () => {
  test('builds a dashboard link for a Stripe payment', () => {
    expect(stripePaymentUrl('pi_123', 'STRIPE')).toBe(
      'https://dashboard.stripe.com/payments/pi_123',
    );
  });

  test('null for PayPal or when there is no captured id', () => {
    expect(stripePaymentUrl('pi_123', 'PAYPAL')).toBeNull();
    expect(stripePaymentUrl(null, 'STRIPE')).toBeNull();
  });
});
