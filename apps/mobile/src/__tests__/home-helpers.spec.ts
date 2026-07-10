import type { BookingVm } from '../lib/booking';
import { firstName, selectUpcomingTrip, timeGreetingKey } from '../lib/home';

function mk(
  code: string,
  status: BookingVm['status'],
  departureDate: string,
): BookingVm {
  return {
    code,
    status,
    statusMeta: { label: status, tone: 'muted' },
    tourTitle: 't',
    tourSlug: 's',
    departureLabel: departureDate,
    departureDate,
    bookedOn: '01 Jan 2026',
    party: '1 adult',
    totalAmount: 1,
    currency: 'USD',
    paymentProvider: 'STRIPE',
    contactName: 'A',
    contactEmail: 'a@a.com',
  };
}

describe('selectUpcomingTrip', () => {
  test('picks the nearest future non-cancelled departure', () => {
    const list = [
      mk('A', 'PAID', '2026-09-01'),
      mk('B', 'PAID', '2026-08-01'),
      mk('C', 'PENDING', '2026-08-15'),
    ];
    expect(selectUpcomingTrip(list, '2026-07-09')?.code).toBe('B');
  });

  test('ignores past, cancelled and refunded bookings', () => {
    const list = [
      mk('past', 'PAID', '2026-06-01'),
      mk('cxl', 'CANCELLED', '2026-08-01'),
      mk('ref', 'REFUNDED', '2026-08-02'),
    ];
    expect(selectUpcomingTrip(list, '2026-07-09')).toBeNull();
  });

  test('a departure exactly today still counts', () => {
    expect(
      selectUpcomingTrip([mk('today', 'PAID', '2026-07-09')], '2026-07-09')
        ?.code,
    ).toBe('today');
  });
});

describe('timeGreetingKey', () => {
  test.each([
    [0, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
  ] as const)('hour %i -> %s', (hour, key) => {
    expect(timeGreetingKey(hour)).toBe(key);
  });
});

describe('firstName', () => {
  test('returns the first token', () => {
    expect(firstName('Yuri Volkov')).toBe('Yuri');
  });
  test('empty string for blank input', () => {
    expect(firstName('   ')).toBe('');
  });
});
