import { dateOnly } from './dates';

describe('dateOnly', () => {
  it('passes a plain YYYY-MM-DD through untouched', () => {
    expect(dateOnly('2026-09-15')).toBe('2026-09-15');
  });

  it('strips the time off the full ISO datetime the API actually sends', () => {
    // The schema says `format: date`, but the wire value is a serialised Prisma `Date`.
    expect(dateOnly('2026-09-15T00:00:00.000Z')).toBe('2026-09-15');
  });

  it('keeps the UTC calendar day, never shifting it to a local one', () => {
    expect(dateOnly('2026-09-15T23:59:59.000Z')).toBe('2026-09-15');
  });
});
