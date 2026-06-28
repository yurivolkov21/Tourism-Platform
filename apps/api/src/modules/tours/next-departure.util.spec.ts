import { nextDepartureInfo, toDateOnlyIso } from './next-departure.util';

describe('toDateOnlyIso', () => {
  it('formats a UTC date as YYYY-MM-DD', () => {
    expect(toDateOnlyIso(new Date('2026-08-15T00:00:00.000Z'))).toBe('2026-08-15');
  });
});

describe('nextDepartureInfo', () => {
  it('returns nulls when there is no upcoming departure', () => {
    expect(nextDepartureInfo()).toEqual({
      nextDepartureDate: null,
      nextDepartureSeatsLeft: null,
    });
    expect(nextDepartureInfo(null)).toEqual({
      nextDepartureDate: null,
      nextDepartureSeatsLeft: null,
    });
  });

  it('maps the soonest departure to date + seats left', () => {
    expect(
      nextDepartureInfo({
        startDate: new Date('2026-08-15T00:00:00.000Z'),
        seatsTotal: 15,
        seatsBooked: 9,
      }),
    ).toEqual({ nextDepartureDate: '2026-08-15', nextDepartureSeatsLeft: 6 });
  });

  it('clamps seats left at 0 (never negative on an overbook race)', () => {
    expect(
      nextDepartureInfo({
        startDate: new Date('2026-08-15T00:00:00.000Z'),
        seatsTotal: 10,
        seatsBooked: 12,
      }).nextDepartureSeatsLeft,
    ).toBe(0);
  });

  it('reports a full departure as 0 seats left (not null)', () => {
    expect(
      nextDepartureInfo({
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        seatsTotal: 8,
        seatsBooked: 8,
      }),
    ).toEqual({ nextDepartureDate: '2026-09-01', nextDepartureSeatsLeft: 0 });
  });
});
