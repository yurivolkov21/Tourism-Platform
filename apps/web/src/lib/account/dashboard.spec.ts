import { daysUntil, summarizeBookings, type DashboardBooking } from './dashboard';

const NOW = new Date('2026-06-27T10:00:00Z');

function booking(status: string, startDate: string, code = 'BK-1'): DashboardBooking {
  return { code, status, tour: { slug: 't', title: 'Tour' }, departure: { startDate } };
}

describe('daysUntil', () => {
  it('is 0 for today and counts whole days regardless of time-of-day', () => {
    expect(daysUntil('2026-06-27', NOW)).toBe(0);
    expect(daysUntil('2026-07-09', NOW)).toBe(12);
    expect(daysUntil('2026-06-20', NOW)).toBe(-7);
  });

  it('returns 0 for an unparseable date', () => {
    expect(daysUntil('not-a-date', NOW)).toBe(0);
  });
});

describe('summarizeBookings', () => {
  it('counts active upcoming, paid completed, and total', () => {
    const stats = summarizeBookings(
      [
        booking('PAID', '2026-07-09', 'A'), // upcoming
        booking('PENDING', '2026-08-01', 'B'), // upcoming (active)
        booking('PAID', '2026-05-01', 'C'), // completed
        booking('CANCELLED', '2026-04-01', 'D'), // ignored
      ],
      NOW,
    );
    expect(stats.total).toBe(4);
    expect(stats.upcoming).toBe(2);
    expect(stats.completed).toBe(1);
  });

  it('sorts upcomingTrips soonest-first and exposes the first as nextTrip', () => {
    const stats = summarizeBookings(
      [booking('PAID', '2026-09-01', 'late'), booking('PAID', '2026-07-09', 'soon')],
      NOW,
    );
    expect(stats.upcomingTrips.map((b) => b.code)).toEqual(['soon', 'late']);
    expect(stats.nextTrip?.code).toBe('soon');
  });

  it('has no nextTrip when nothing upcoming', () => {
    const stats = summarizeBookings([booking('PAID', '2026-01-01', 'past')], NOW);
    expect(stats.nextTrip).toBeNull();
    expect(stats.upcoming).toBe(0);
  });
});
