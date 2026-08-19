import { daysUntilDeparture, tripLengthDays } from './countdown';

const at = (day: string) => new Date(`${day}T12:00:00.000Z`);
const TRIP = { start: '2026-09-14', end: '2026-09-16' };

describe('daysUntilDeparture', () => {
  it('counts whole days ahead of the departure', () => {
    expect(daysUntilDeparture(TRIP.start, TRIP.end, at('2026-08-12'))).toEqual({
      kind: 'upcoming',
      days: 33,
    });
  });

  it('reports one day ahead as `upcoming` with days=1 (copy says "tomorrow")', () => {
    expect(daysUntilDeparture(TRIP.start, TRIP.end, at('2026-09-13'))).toEqual({
      kind: 'upcoming',
      days: 1,
    });
  });

  it('reports the departure date itself as `today`', () => {
    expect(daysUntilDeparture(TRIP.start, TRIP.end, at('2026-09-14'))).toEqual({
      kind: 'today',
      days: 0,
    });
  });

  it('reports a date between start and end as `ongoing`', () => {
    expect(daysUntilDeparture(TRIP.start, TRIP.end, at('2026-09-15'))).toEqual({
      kind: 'ongoing',
      days: 0,
    });
  });

  it('treats the end date itself as still ongoing', () => {
    expect(
      daysUntilDeparture(TRIP.start, TRIP.end, at('2026-09-16')),
    ).toMatchObject({ kind: 'ongoing' });
  });

  it('reports a date past the end as `past`', () => {
    expect(daysUntilDeparture(TRIP.start, TRIP.end, at('2026-09-17'))).toEqual({
      kind: 'past',
      days: 0,
    });
  });

  it('ignores the clock time — only the UTC day boundary counts', () => {
    const lateNight = new Date('2026-09-13T23:59:00.000Z');
    const earlyMorning = new Date('2026-09-13T00:01:00.000Z');
    expect(daysUntilDeparture(TRIP.start, TRIP.end, lateNight)).toEqual(
      daysUntilDeparture(TRIP.start, TRIP.end, earlyMorning),
    );
  });

  it('handles a single-day trip (start === end)', () => {
    expect(
      daysUntilDeparture('2026-09-14', '2026-09-14', at('2026-09-14')),
    ).toMatchObject({ kind: 'today' });
    expect(
      daysUntilDeparture('2026-09-14', '2026-09-14', at('2026-09-15')),
    ).toMatchObject({ kind: 'past' });
  });

  it('spans a month boundary correctly', () => {
    expect(
      daysUntilDeparture('2026-09-01', '2026-09-03', at('2026-08-30')),
    ).toEqual({ kind: 'upcoming', days: 2 });
  });

  it('falls back to a live clock when no `now` is passed', () => {
    expect(() => daysUntilDeparture(TRIP.start, TRIP.end)).not.toThrow();
  });

  // The API documents these as `format: date` but sends serialised Prisma `Date`s.
  it('accepts the full ISO datetimes the API actually sends', () => {
    expect(
      daysUntilDeparture(
        '2026-09-14T00:00:00.000Z',
        '2026-09-16T00:00:00.000Z',
        at('2026-08-12'),
      ),
    ).toEqual({ kind: 'upcoming', days: 33 });
  });

  it('still recognises the departure day when given full ISO datetimes', () => {
    expect(
      daysUntilDeparture(
        '2026-09-14T00:00:00.000Z',
        '2026-09-16T00:00:00.000Z',
        at('2026-09-14'),
      ),
    ).toMatchObject({ kind: 'today' });
  });
});

describe('tripLengthDays', () => {
  it('counts the span inclusively (14th→16th is a 3-day trip)', () => {
    expect(tripLengthDays('2026-09-14', '2026-09-16')).toBe(3);
  });

  it('counts a same-day tour as 1 day, not 0', () => {
    expect(tripLengthDays('2026-09-14', '2026-09-14')).toBe(1);
  });

  it('never returns less than 1, even on inverted dates', () => {
    expect(tripLengthDays('2026-09-16', '2026-09-14')).toBe(1);
  });

  it('spans a month boundary correctly', () => {
    expect(tripLengthDays('2026-08-30', '2026-09-02')).toBe(4);
  });

  it('accepts the full ISO datetimes the API actually sends', () => {
    expect(
      tripLengthDays('2026-09-14T00:00:00.000Z', '2026-09-16T00:00:00.000Z'),
    ).toBe(3);
  });
});
