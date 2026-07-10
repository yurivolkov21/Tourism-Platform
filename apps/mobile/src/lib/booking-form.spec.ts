import { buildCreateBookingPayload, type BookingFormRaw } from './booking-form';

const valid: BookingFormRaw = {
  tourSlug: 'hoi-an-walking-tour',
  departureId: 'dep-1',
  numAdults: 2,
  numChildren: 1,
  paymentProvider: 'STRIPE',
  contactName: '  Nguyen Van A  ',
  contactEmail: ' a@example.com ',
  contactPhone: ' +84901234567 ',
  specialRequests: '  Vegetarian  ',
};

test('builds a trimmed payload from valid fields', () => {
  const result = buildCreateBookingPayload(valid);
  expect(result).toEqual({
    ok: true,
    payload: {
      tourSlug: 'hoi-an-walking-tour',
      departureId: 'dep-1',
      numAdults: 2,
      numChildren: 1,
      paymentProvider: 'STRIPE',
      contactName: 'Nguyen Van A',
      contactEmail: 'a@example.com',
      contactPhone: '+84901234567',
      specialRequests: 'Vegetarian',
    },
  });
});

test('coerces string counts to ints', () => {
  const result = buildCreateBookingPayload({
    ...valid,
    numAdults: '3',
    numChildren: '0',
  });
  expect(result.ok && result.payload.numAdults).toBe(3);
  expect(result.ok && result.payload.numChildren).toBeUndefined();
});

test('omits empty optionals and zero children', () => {
  const result = buildCreateBookingPayload({
    ...valid,
    numChildren: 0,
    contactPhone: '   ',
    specialRequests: '',
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.payload).not.toHaveProperty('numChildren');
    expect(result.payload).not.toHaveProperty('contactPhone');
    expect(result.payload).not.toHaveProperty('specialRequests');
  }
});

test.each([
  [{ ...valid, tourSlug: '  ' }, 'MISSING_TOUR'],
  [{ ...valid, departureId: '' }, 'MISSING_DEPARTURE'],
  [{ ...valid, numAdults: 0 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numAdults: 21 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numChildren: -1 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numChildren: 21 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numAdults: 'abc' }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, paymentProvider: 'CASH' }, 'INVALID_PROVIDER'],
  [{ ...valid, contactName: 'A' }, 'INVALID_CONTACT'],
  [{ ...valid, contactEmail: 'not-an-email' }, 'INVALID_CONTACT'],
] as [BookingFormRaw, string][])('rejects %j with %s', (raw, error) => {
  expect(buildCreateBookingPayload(raw)).toEqual({ ok: false, error });
});
