import { formatShortDate } from './format-date';

describe('formatShortDate', () => {
  it('formats an ISO timestamp as an en-GB short date', () => {
    expect(formatShortDate('2026-07-05T08:00:00.000Z')).toBe('5 Jul 2026');
  });

  it('renders a dash for null and undefined', () => {
    expect(formatShortDate(null)).toBe('—');
    expect(formatShortDate(undefined)).toBe('—');
  });

  it('renders a dash for unparsable input', () => {
    expect(formatShortDate('not-a-date')).toBe('—');
  });
});
