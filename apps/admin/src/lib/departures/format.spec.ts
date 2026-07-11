import { isDeparturePast, matchesTimeTab, toDateOnly } from './format';

describe('toDateOnly', () => {
  it('trims a full ISO datetime to YYYY-MM-DD', () => {
    expect(toDateOnly('2026-08-15T00:00:00.000Z')).toBe('2026-08-15');
  });

  it('leaves a bare date untouched', () => {
    expect(toDateOnly('2026-08-15')).toBe('2026-08-15');
  });
});

describe('isDeparturePast', () => {
  it('is true for a start date before today', () => {
    expect(isDeparturePast('2000-01-01')).toBe(true);
  });

  it('is false for a start date in the future', () => {
    expect(isDeparturePast('2999-12-31')).toBe(false);
  });

  it('is false for today (still bookable — walk-in parity)', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isDeparturePast(today)).toBe(false);
  });

  it('tolerates a full ISO datetime (compares the date part only)', () => {
    expect(isDeparturePast('2000-01-01T00:00:00.000Z')).toBe(true);
  });
});

describe('matchesTimeTab', () => {
  const today = new Date().toISOString().slice(0, 10);

  it("'all' matches everything", () => {
    expect(matchesTimeTab('2000-01-01', 'all')).toBe(true);
    expect(matchesTimeTab('2999-12-31', 'all')).toBe(true);
  });

  it("'upcoming' matches future dates and today (walk-in parity with isDeparturePast)", () => {
    expect(matchesTimeTab('2999-12-31', 'upcoming')).toBe(true);
    expect(matchesTimeTab(today, 'upcoming')).toBe(true);
    expect(matchesTimeTab('2000-01-01', 'upcoming')).toBe(false);
  });

  it("'past' matches only dates strictly before today", () => {
    expect(matchesTimeTab('2000-01-01', 'past')).toBe(true);
    expect(matchesTimeTab(today, 'past')).toBe(false);
    expect(matchesTimeTab('2999-12-31', 'past')).toBe(false);
  });

  it('tolerates full ISO datetimes', () => {
    expect(matchesTimeTab('2000-01-01T00:00:00.000Z', 'past')).toBe(true);
    expect(matchesTimeTab('2999-12-31T00:00:00.000Z', 'upcoming')).toBe(true);
  });
});
