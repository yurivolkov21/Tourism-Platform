import { tourAvailability, formatShortDate, LOW_SEATS_THRESHOLD } from './availability';

describe('tourAvailability', () => {
  it('is "onRequest" when there is no upcoming departure', () => {
    expect(tourAvailability(null, null)).toEqual({ kind: 'onRequest' });
    expect(tourAvailability(undefined, 4)).toEqual({ kind: 'onRequest' });
  });

  it('is "low" when seats are 1..threshold', () => {
    expect(tourAvailability('2026-08-15', 1)).toEqual({ kind: 'low', seatsLeft: 1 });
    expect(tourAvailability('2026-08-15', LOW_SEATS_THRESHOLD)).toEqual({
      kind: 'low',
      seatsLeft: LOW_SEATS_THRESHOLD,
    });
  });

  it('shows the date (not "low") when seats are above the threshold', () => {
    expect(tourAvailability('2026-08-15', LOW_SEATS_THRESHOLD + 1)).toEqual({
      kind: 'next',
      date: '2026-08-15',
    });
  });

  it('never renders "sold out": a 0-seat nearest departure falls back to the date', () => {
    expect(tourAvailability('2026-08-15', 0)).toEqual({ kind: 'next', date: '2026-08-15' });
    expect(tourAvailability('2026-08-15', null)).toEqual({ kind: 'next', date: '2026-08-15' });
  });

  it('respects a custom threshold', () => {
    expect(tourAvailability('2026-08-15', 3, 2)).toEqual({ kind: 'next', date: '2026-08-15' });
    expect(tourAvailability('2026-08-15', 2, 2)).toEqual({ kind: 'low', seatsLeft: 2 });
  });
});

describe('formatShortDate', () => {
  it('formats a YYYY-MM-DD as "D Mon"', () => {
    expect(formatShortDate('2026-08-15')).toBe('15 Aug');
    expect(formatShortDate('2026-01-03')).toBe('3 Jan');
  });

  it('returns the input unchanged when it is not a valid date', () => {
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
  });
});
