import { buildCreateBookingPayload } from './booking-form';

const valid = {
  tourSlug: 'hoi-an-walking-tour',
  departureId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  numAdults: '2',
  numChildren: '1',
  paymentProvider: 'STRIPE',
  contactName: '  Nguyen Van A  ',
  contactEmail: '  guest@example.com ',
  contactPhone: ' +84901234567 ',
  specialRequests: '  Vegetarian meals  ',
};

describe('buildCreateBookingPayload', () => {
  it('maps + trims a full valid form, coercing ints', () => {
    const result = buildCreateBookingPayload(valid);

    expect(result).toEqual({
      ok: true,
      payload: {
        tourSlug: 'hoi-an-walking-tour',
        departureId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        numAdults: 2,
        numChildren: 1,
        paymentProvider: 'STRIPE',
        contactName: 'Nguyen Van A',
        contactEmail: 'guest@example.com',
        contactPhone: '+84901234567',
        specialRequests: 'Vegetarian meals',
      },
    });
  });

  it('drops empty optionals (no numChildren / phone / requests)', () => {
    const result = buildCreateBookingPayload({
      ...valid,
      numChildren: '0',
      contactPhone: '   ',
      specialRequests: '',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).not.toHaveProperty('numChildren');
    expect(result.payload).not.toHaveProperty('contactPhone');
    expect(result.payload).not.toHaveProperty('specialRequests');
  });

  it('accepts PAYPAL as a gateway', () => {
    const result = buildCreateBookingPayload({ ...valid, paymentProvider: 'PAYPAL' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.paymentProvider).toBe('PAYPAL');
  });

  it('rejects an unknown gateway', () => {
    const result = buildCreateBookingPayload({ ...valid, paymentProvider: 'BITCOIN' });
    expect(result).toEqual({ ok: false, error: 'INVALID_PROVIDER' });
  });

  it('rejects 0 adults and >20 adults', () => {
    expect(buildCreateBookingPayload({ ...valid, numAdults: '0' })).toEqual({
      ok: false,
      error: 'INVALID_PARTY_SIZE',
    });
    expect(buildCreateBookingPayload({ ...valid, numAdults: '21' })).toEqual({
      ok: false,
      error: 'INVALID_PARTY_SIZE',
    });
  });

  it('rejects >20 children', () => {
    expect(buildCreateBookingPayload({ ...valid, numChildren: '21' })).toEqual({
      ok: false,
      error: 'INVALID_PARTY_SIZE',
    });
  });

  it('rejects a missing departure or tour', () => {
    expect(buildCreateBookingPayload({ ...valid, departureId: '  ' })).toEqual({
      ok: false,
      error: 'MISSING_DEPARTURE',
    });
  });

  it('rejects missing contact name / invalid email', () => {
    expect(buildCreateBookingPayload({ ...valid, contactName: ' ' })).toEqual({
      ok: false,
      error: 'INVALID_CONTACT',
    });
    expect(buildCreateBookingPayload({ ...valid, contactEmail: 'not-an-email' })).toEqual({
      ok: false,
      error: 'INVALID_CONTACT',
    });
  });
});
