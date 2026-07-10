import {
  formatShortDate,
  LOW_SEATS_THRESHOLD,
  tourAvailability,
} from './availability.js';

describe('tourAvailability', () => {
  it('returns onRequest when no date', () => {
    expect(tourAvailability(null, null)).toEqual({ kind: 'onRequest' });
    expect(tourAvailability(undefined, 4)).toEqual({ kind: 'onRequest' });
  });

  it('returns low when seats are within threshold', () => {
    expect(tourAvailability('2026-08-15', 1)).toEqual({ kind: 'low', seatsLeft: 1 });
    expect(tourAvailability('2026-08-15', LOW_SEATS_THRESHOLD)).toEqual({
      kind: 'low',
      seatsLeft: LOW_SEATS_THRESHOLD,
    });
  });

  it('returns next when seats exceed threshold', () => {
    expect(tourAvailability('2026-08-15', LOW_SEATS_THRESHOLD + 1)).toEqual({
      kind: 'next',
      date: '2026-08-15',
    });
  });

  it('returns next when seats are zero or unknown', () => {
    expect(tourAvailability('2026-08-15', 0)).toEqual({ kind: 'next', date: '2026-08-15' });
    expect(tourAvailability('2026-08-15', null)).toEqual({ kind: 'next', date: '2026-08-15' });
  });

  it('respects custom threshold', () => {
    expect(tourAvailability('2026-08-15', 3, 2)).toEqual({ kind: 'next', date: '2026-08-15' });
    expect(tourAvailability('2026-08-15', 2, 2)).toEqual({ kind: 'low', seatsLeft: 2 });
  });
});

describe('formatShortDate', () => {
  it('formats YYYY-MM-DD as day + short month', () => {
    expect(formatShortDate('2026-08-15')).toBe('15 Aug');
    expect(formatShortDate('2026-01-03')).toBe('3 Jan');
  });

  it('returns input when invalid', () => {
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
  });
});
