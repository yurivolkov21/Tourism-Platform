import { buildPrivateEnquiryPayload, deriveEndDate } from './private-request';

describe('deriveEndDate', () => {
  it('spans durationDays dates inclusive (5-day trip = start + 4)', () => {
    expect(deriveEndDate('2026-08-10', 5)).toBe('2026-08-14');
    expect(deriveEndDate('2026-08-10', 1)).toBe('2026-08-10');
  });

  it('returns the start for invalid input', () => {
    expect(deriveEndDate('not-a-date', 5)).toBe('not-a-date');
    expect(deriveEndDate('2026-08-10', 0)).toBe('2026-08-10');
  });

  it('rolls across month boundaries', () => {
    expect(deriveEndDate('2026-08-30', 5)).toBe('2026-09-03');
  });
});

describe('buildPrivateEnquiryPayload', () => {
  const base = {
    tourId: 't-1',
    tourTitle: 'Sa Pa Trek',
    durationDays: 3,
    startDate: '2026-09-01',
    name: '  Jane  ',
    email: ' jane@example.com ',
    adults: 2,
    children: 1,
  };

  it('maps structured fields + composes a readable message', () => {
    const p = buildPrivateEnquiryPayload({ ...base, requests: 'Vegetarian meals' });
    expect(p.tourId).toBe('t-1');
    expect(p.travelDate).toBe('2026-09-01');
    expect(p.groupSize).toBe(3);
    expect(p.name).toBe('Jane'); // trimmed
    expect(p.email).toBe('jane@example.com');
    expect(p.message).toContain('Sa Pa Trek');
    expect(p.message).toContain('2026-09-01 → 2026-09-03');
    expect(p.message).toContain('2 adults, 1 child');
    expect(p.message).toContain('Vegetarian meals');
  });

  it('omits empty phone + notes and pluralises party correctly', () => {
    const p = buildPrivateEnquiryPayload({
      ...base,
      adults: 1,
      children: 0,
      phone: '   ',
    });
    expect(p.phone).toBeUndefined();
    expect(p.groupSize).toBe(1);
    expect(p.message).toContain('Party: 1 adult.');
    expect(p.message).not.toContain('Notes:');
  });
});
