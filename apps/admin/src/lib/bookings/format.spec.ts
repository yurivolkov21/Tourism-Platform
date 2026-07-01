import { bookingStatusMeta, canRefund, formatGuests, formatMoney } from './format';

describe('bookingStatusMeta', () => {
  test('maps each status to a friendly label + badge variant', () => {
    expect(bookingStatusMeta('PENDING')).toEqual({ label: 'Pending payment', variant: 'secondary' });
    expect(bookingStatusMeta('PAID')).toEqual({ label: 'Paid', variant: 'default' });
    expect(bookingStatusMeta('CANCELLED')).toEqual({ label: 'Cancelled', variant: 'outline' });
    expect(bookingStatusMeta('REFUNDED')).toEqual({ label: 'Refunded', variant: 'destructive' });
  });
});

describe('canRefund', () => {
  test('only a PAID booking can be refunded', () => {
    expect(canRefund('PAID')).toBe(true);
    expect(canRefund('PENDING')).toBe(false);
    expect(canRefund('CANCELLED')).toBe(false);
    expect(canRefund('REFUNDED')).toBe(false);
  });
});

describe('formatMoney', () => {
  test('formats a decimal string in its currency', () => {
    expect(formatMoney('99.00', 'USD')).toBe('$99.00');
    expect(formatMoney('1250.5', 'USD')).toBe('$1,250.50');
  });

  test('falls back to "amount currency" when the amount is not a number', () => {
    expect(formatMoney('n/a', 'USD')).toBe('n/a USD');
  });
});

describe('formatGuests', () => {
  test('pluralizes adults and omits children when there are none', () => {
    expect(formatGuests(1, 0)).toBe('1 adult');
    expect(formatGuests(2, 0)).toBe('2 adults');
  });

  test('includes children with pluralization when present', () => {
    expect(formatGuests(2, 1)).toBe('2 adults, 1 child');
    expect(formatGuests(2, 3)).toBe('2 adults, 3 children');
  });
});
