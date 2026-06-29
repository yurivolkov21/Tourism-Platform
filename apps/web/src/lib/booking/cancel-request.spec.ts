import { buildCancellationRequestPayload } from './cancel-request';

const base = {
  code: 'BK-ABC123',
  tourTitle: 'Hoi An Walking Tour',
  departureDate: '15 Aug 2026',
  name: 'Jane Traveller',
  email: 'jane@example.com',
  reason: 'Change of plans',
};

describe('buildCancellationRequestPayload', () => {
  it('carries the booking code, tour, date and reason in the message', () => {
    const p = buildCancellationRequestPayload(base);
    expect(p.message).toContain('BK-ABC123');
    expect(p.message).toContain('Hoi An Walking Tour');
    expect(p.message).toContain('15 Aug 2026');
    expect(p.message).toContain('Change of plans');
    expect(p.name).toBe('Jane Traveller');
    expect(p.email).toBe('jane@example.com');
  });

  it('falls back to "(not provided)" when no reason is given', () => {
    expect(buildCancellationRequestPayload({ ...base, reason: '   ' }).message).toContain(
      'Reason: (not provided)',
    );
  });

  it('falls back to "Customer" when the name is blank', () => {
    expect(buildCancellationRequestPayload({ ...base, name: '  ' }).name).toBe('Customer');
  });
});
