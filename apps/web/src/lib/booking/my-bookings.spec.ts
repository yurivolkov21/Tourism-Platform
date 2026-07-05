import { bookingStatusTone, formatTripDate } from './my-bookings';

describe('formatTripDate', () => {
  it('formats a YYYY-MM-DD date as "24 Jul 2026" (UTC, no off-by-one)', () => {
    expect(formatTripDate('2026-07-24')).toBe('24 Jul 2026');
    expect(formatTripDate('2026-07-24T00:00:00.000Z')).toBe('24 Jul 2026');
  });

  it('returns the raw value on an unparseable date', () => {
    expect(formatTripDate('')).toBe('');
    expect(formatTripDate('not-a-date')).toBe('not-a-date');
  });
});

describe('bookingStatusTone', () => {
  it('maps each status to a token-based (no-hex) tone', () => {
    expect(bookingStatusTone('PAID')).toContain('text-success');
    expect(bookingStatusTone('PENDING')).toContain('text-warning');
    expect(bookingStatusTone('CANCELLED')).toContain('text-muted-foreground');
    expect(bookingStatusTone('REFUNDED')).toContain('text-destructive');
    expect(bookingStatusTone('PARTIALLY_REFUNDED')).toContain('text-destructive');
  });

  it('falls back to the muted tone for an unknown status', () => {
    expect(bookingStatusTone('WHATEVER')).toBe(bookingStatusTone('CANCELLED'));
  });
});
