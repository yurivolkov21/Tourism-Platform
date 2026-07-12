import {
  parseDateParam,
  presetRange,
  matchPreset,
  type RangePreset,
} from './date-range';

describe('parseDateParam', () => {
  it('accepts a well-formed real calendar date', () => {
    expect(parseDateParam('2026-06-01')).toBe('2026-06-01');
  });

  it('accepts a leap-day date in a leap year', () => {
    expect(parseDateParam('2024-02-29')).toBe('2024-02-29');
  });

  it('rejects a non-existent day in a non-leap year', () => {
    expect(parseDateParam('2026-02-30')).toBeUndefined();
    expect(parseDateParam('2023-02-29')).toBeUndefined();
  });

  it('rejects an out-of-range month', () => {
    expect(parseDateParam('2026-13-01')).toBeUndefined();
    expect(parseDateParam('2026-00-01')).toBeUndefined();
  });

  it('rejects malformed strings', () => {
    expect(parseDateParam('2026-6-1')).toBeUndefined();
    expect(parseDateParam('not-a-date')).toBeUndefined();
    expect(parseDateParam('')).toBeUndefined();
  });

  it('rejects arrays and undefined', () => {
    expect(parseDateParam(['2026-06-01', '2026-06-02'])).toBeUndefined();
    expect(parseDateParam(undefined)).toBeUndefined();
  });
});

describe('presetRange', () => {
  it('7d spans today-6 .. today', () => {
    const today = new Date(2026, 5, 15); // June 15, 2026 (local)
    expect(presetRange('7d', today)).toEqual({
      from: '2026-06-09',
      to: '2026-06-15',
    });
  });

  it('30d spans today-29 .. today', () => {
    const today = new Date(2026, 5, 15);
    expect(presetRange('30d', today)).toEqual({
      from: '2026-05-17',
      to: '2026-06-15',
    });
  });

  it('90d spans today-89 .. today', () => {
    const today = new Date(2026, 5, 15);
    expect(presetRange('90d', today)).toEqual({
      from: '2026-03-18',
      to: '2026-06-15',
    });
  });

  it('month spans the 1st of the current month .. today', () => {
    const today = new Date(2026, 5, 15);
    expect(presetRange('month', today)).toEqual({
      from: '2026-06-01',
      to: '2026-06-15',
    });
  });

  it('all returns no bounds', () => {
    const today = new Date(2026, 5, 15);
    expect(presetRange('all', today)).toEqual({});
  });

  it('handles the month edge — today is the 1st', () => {
    const today = new Date(2026, 2, 1); // March 1, 2026
    expect(presetRange('month', today)).toEqual({
      from: '2026-03-01',
      to: '2026-03-01',
    });
    // 7d crosses back into February.
    expect(presetRange('7d', today)).toEqual({
      from: '2026-02-23',
      to: '2026-03-01',
    });
  });

  it('handles a leap-day today', () => {
    const today = new Date(2024, 1, 29); // Feb 29, 2024
    expect(presetRange('7d', today)).toEqual({
      from: '2024-02-23',
      to: '2024-02-29',
    });
    expect(presetRange('month', today)).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });

  it('90d crosses a year boundary correctly', () => {
    const today = new Date(2026, 0, 15); // Jan 15, 2026
    expect(presetRange('90d', today)).toEqual({
      from: '2025-10-18',
      to: '2026-01-15',
    });
  });
});

describe('matchPreset', () => {
  const today = new Date(2026, 5, 15);

  it('returns "all" when neither from nor to is set', () => {
    expect(matchPreset(undefined, undefined, today)).toBe('all');
  });

  it('returns "custom" when only one bound is set', () => {
    expect(matchPreset('2026-06-01', undefined, today)).toBe('custom');
    expect(matchPreset(undefined, '2026-06-01', today)).toBe('custom');
  });

  it('returns "custom" for an arbitrary range', () => {
    expect(matchPreset('2026-01-01', '2026-01-31', today)).toBe('custom');
  });

  const presets: RangePreset[] = ['7d', '30d', '90d', 'month', 'all'];

  it.each(presets)(
    'round-trips presetRange -> matchPreset for %s',
    (preset) => {
      const range = presetRange(preset, today);
      expect(matchPreset(range.from, range.to, today)).toBe(preset);
    },
  );

  it('round-trips every preset across a month edge (today = the 1st)', () => {
    const edgeToday = new Date(2026, 2, 1); // March 1, 2026
    for (const preset of presets) {
      const range = presetRange(preset, edgeToday);
      expect(matchPreset(range.from, range.to, edgeToday)).toBe(preset);
    }
  });

  it('round-trips every preset on a leap day', () => {
    const leapToday = new Date(2024, 1, 29);
    for (const preset of presets) {
      const range = presetRange(preset, leapToday);
      expect(matchPreset(range.from, range.to, leapToday)).toBe(preset);
    }
  });
});
