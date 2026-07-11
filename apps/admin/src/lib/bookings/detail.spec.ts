import {
  bookingBreakdown,
  buildBookingTimeline,
  formatRelativeTime,
  stripePaymentUrl,
} from './detail';

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
      {
        key: 'created',
        label: 'Created',
        at: '2026-06-30T08:00:00.000Z',
        done: true,
      },
      {
        key: 'paid',
        label: 'Paid',
        at: '2026-07-01T10:00:00.000Z',
        done: true,
      },
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
    expect(formatRelativeTime('2026-07-10T11:59:30.000Z', now)).toBe(
      'just now',
    );
  });

  test('minutes and hours', () => {
    expect(formatRelativeTime('2026-07-10T11:55:00.000Z', now)).toBe(
      '5 min ago',
    );
    expect(formatRelativeTime('2026-07-10T09:00:00.000Z', now)).toBe(
      '3 hours ago',
    );
    expect(formatRelativeTime('2026-07-10T11:00:00.000Z', now)).toBe(
      '1 hour ago',
    );
  });

  test('days', () => {
    expect(formatRelativeTime('2026-07-08T12:00:00.000Z', now)).toBe(
      '2 days ago',
    );
    expect(formatRelativeTime('2026-07-09T12:00:00.000Z', now)).toBe(
      '1 day ago',
    );
  });

  test('older than ~30 days → absolute date', () => {
    expect(formatRelativeTime('2026-05-01T12:00:00.000Z', now)).toBe(
      '1 May 2026',
    );
  });

  test('invalid input → empty string', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});

describe('bookingBreakdown', () => {
  const detail = (over: Partial<Parameters<typeof bookingBreakdown>[0]>) => ({
    numAdults: 2,
    numChildren: 1,
    totalAmount: '150.00',
    currency: 'USD',
    ...over,
  });

  test('null when there are no guests', () => {
    expect(
      bookingBreakdown(detail({ numAdults: 0, numChildren: 0 })),
    ).toBeNull();
  });

  test('null when the total is unparsable', () => {
    expect(
      bookingBreakdown(detail({ totalAmount: 'not-a-number' })),
    ).toBeNull();
    expect(bookingBreakdown(detail({ totalAmount: '' }))).toBeNull();
  });

  test('splits evenly across adults + children, rows sum to total', () => {
    const result = bookingBreakdown(detail({}));
    expect(result).not.toBeNull();
    expect(result?.perTraveller).toBe(50);
    expect(result?.rows).toEqual([
      { label: '2 adults', amount: 100 },
      { label: '1 child', amount: 50 },
    ]);
    expect(result?.total).toBe(150);
  });

  test('singular labels for exactly one adult / one child', () => {
    const result = bookingBreakdown(
      detail({ numAdults: 1, numChildren: 1, totalAmount: '100.00' }),
    );
    expect(result?.rows.map((r) => r.label)).toEqual(['1 adult', '1 child']);
  });

  test('omits a zero-count group — the single remaining row carries the whole total', () => {
    const result = bookingBreakdown(
      detail({ numAdults: 3, numChildren: 0, totalAmount: '100.00' }),
    );
    expect(result?.rows).toEqual([{ label: '3 adults', amount: 100 }]);
  });

  test('remainder-adjusts the last row so cents never drift on an uneven split', () => {
    const result = bookingBreakdown(
      detail({ numAdults: 2, numChildren: 1, totalAmount: '100.01' }),
    );
    expect(result?.rows).toEqual([
      { label: '2 adults', amount: 66.66 },
      { label: '1 child', amount: 33.35 },
    ]);
    const sum = result?.rows.reduce((s, r) => s + r.amount, 0);
    expect(Math.round((sum ?? 0) * 100) / 100).toBe(100.01);
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

describe('bookingBreakdown — negative totals', () => {
  it('returns null for a negative total (never renders a nonsense card)', () => {
    expect(
      bookingBreakdown({
        numAdults: 2,
        numChildren: 0,
        totalAmount: '-100.00',
        currency: 'USD',
      }),
    ).toBeNull();
  });
});
