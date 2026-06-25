import {
  buildEnquiryCtaPayload,
  buildPlanTripPayload,
  composeEnquiryMessage,
  composePlanTripMessage,
  ENQUIRY_FALLBACK_MESSAGE,
  isValidEnquiry,
  parseGroupSize,
  type PlanTripRaw,
} from './enquiry-form';

describe('parseGroupSize', () => {
  it('coerces a valid count', () => {
    expect(parseGroupSize('4')).toBe(4);
  });
  it('returns undefined for blank / invalid / out-of-range', () => {
    expect(parseGroupSize('')).toBeUndefined();
    expect(parseGroupSize(undefined)).toBeUndefined();
    expect(parseGroupSize('0')).toBeUndefined();
    expect(parseGroupSize('abc')).toBeUndefined();
    expect(parseGroupSize('500')).toBeUndefined();
  });
});

describe('composePlanTripMessage', () => {
  it('keeps the note and appends a duration line', () => {
    const out = composePlanTripMessage('We want a relaxed honeymoon.', 'About a week');
    expect(out).toContain('We want a relaxed honeymoon.');
    expect(out).toContain('Preferred duration: About a week.');
  });
  it('uses the duration line alone when there is no note', () => {
    expect(composePlanTripMessage('', '2+ weeks')).toBe('Preferred duration: 2+ weeks.');
  });
  it('falls back when nothing usable is provided', () => {
    expect(composePlanTripMessage('hi', null)).toBe(ENQUIRY_FALLBACK_MESSAGE);
    expect(composePlanTripMessage('', null)).toBe(ENQUIRY_FALLBACK_MESSAGE);
  });
});

describe('composeEnquiryMessage', () => {
  it('derives a message from the destination', () => {
    expect(composeEnquiryMessage('Hạ Long Bay')).toBe("I'd like to enquire about: Hạ Long Bay.");
  });
  it('falls back when destination is empty', () => {
    expect(composeEnquiryMessage('   ')).toBe(ENQUIRY_FALLBACK_MESSAGE);
  });
});

describe('buildPlanTripPayload', () => {
  const base: PlanTripRaw = {
    name: '  Alex  ',
    email: ' alex@example.com ',
    phone: '',
    nationality: 'Australian',
    travelDate: '2026-08-01',
    groupSize: '2',
    message: 'Two adults, love food and culture.',
    duration: '4–6 days',
    budget: 'Premium · 4★',
    interests: ['Food', 'Culture & heritage'],
    website: '',
  };

  it('trims name/email, maps budget→budgetTier and interests, coerces groupSize', () => {
    const p = buildPlanTripPayload(base);
    expect(p.name).toBe('Alex');
    expect(p.email).toBe('alex@example.com');
    expect(p.budgetTier).toBe('Premium · 4★');
    expect(p.interests).toEqual(['Food', 'Culture & heritage']);
    expect(p.groupSize).toBe(2);
    expect(p.nationality).toBe('Australian');
    expect(p.message).toContain('Preferred duration: 4–6 days.');
  });

  it('drops empty optionals (phone/website) and empty interests', () => {
    const p = buildPlanTripPayload({ ...base, phone: '', website: '', interests: [], budget: null });
    expect(p.phone).toBeUndefined();
    expect(p.website).toBeUndefined();
    expect(p.interests).toBeUndefined();
    expect(p.budgetTier).toBeUndefined();
  });
});

describe('buildEnquiryCtaPayload', () => {
  it('builds name/email/message from the compact form', () => {
    const p = buildEnquiryCtaPayload({ name: ' Sam ', email: 'sam@x.io', destination: 'Sa Pa' });
    expect(p).toEqual({
      name: 'Sam',
      email: 'sam@x.io',
      message: "I'd like to enquire about: Sa Pa.",
      website: undefined,
    });
  });
});

describe('isValidEnquiry', () => {
  it('accepts a valid name + email', () => {
    expect(isValidEnquiry({ name: 'Alex', email: 'a@b.co' })).toBe(true);
  });
  it('rejects short name or bad email', () => {
    expect(isValidEnquiry({ name: 'A', email: 'a@b.co' })).toBe(false);
    expect(isValidEnquiry({ name: 'Alex', email: 'not-an-email' })).toBe(false);
  });
});
