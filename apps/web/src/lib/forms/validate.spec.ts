import {
  validateBookingContactFields,
  validateContactFields,
  validateEmailField,
  validateEnquiryFields,
  validateRequiredText,
  validateReviewFields,
} from './validate';

describe('validateEmailField', () => {
  it('accepts a plausible address (trimmed)', () => {
    expect(validateEmailField('you@example.com')).toBeNull();
    expect(validateEmailField('  you@example.com  ')).toBeNull();
  });

  it('requires a value and rejects malformed addresses', () => {
    expect(validateEmailField('')).toBe('REQUIRED');
    expect(validateEmailField('   ')).toBe('REQUIRED');
    expect(validateEmailField('not-an-email')).toBe('INVALID');
    expect(validateEmailField('you@example')).toBe('INVALID');
  });
});

describe('validateRequiredText', () => {
  it('accepts trimmed text meeting the min length', () => {
    expect(validateRequiredText(' An ', 2)).toBeNull();
  });

  it('flags empty or too-short text as REQUIRED', () => {
    expect(validateRequiredText('', 2)).toBe('REQUIRED');
    expect(validateRequiredText('  ', 2)).toBe('REQUIRED');
    expect(validateRequiredText(' A ', 2)).toBe('REQUIRED');
  });

  it('defaults to min length 1', () => {
    expect(validateRequiredText('A')).toBeNull();
  });
});

describe('validateEnquiryFields (EnquiryCta / PlanTrip)', () => {
  it('passes name + valid email', () => {
    expect(
      validateEnquiryFields({ name: 'Nguyen Van A', email: 'a@b.com' }),
    ).toEqual({});
  });

  it('flags both fields when empty', () => {
    expect(validateEnquiryFields({ name: '', email: '' })).toEqual({
      name: 'REQUIRED',
      email: 'REQUIRED',
    });
  });

  it('applies the 2-char name rule and email shape', () => {
    expect(validateEnquiryFields({ name: 'A', email: 'nope' })).toEqual({
      name: 'REQUIRED',
      email: 'INVALID',
    });
  });
});

describe('validateContactFields (contact page)', () => {
  const valid = {
    firstName: 'Nguyen',
    lastName: 'A',
    email: 'a@b.com',
    terms: true,
  };

  it('passes a valid form', () => {
    expect(validateContactFields(valid)).toEqual({});
  });

  it('flags every missing field at once, including unchecked terms', () => {
    expect(
      validateContactFields({
        firstName: '',
        lastName: ' ',
        email: '',
        terms: false,
      }),
    ).toEqual({
      firstName: 'REQUIRED',
      lastName: 'REQUIRED',
      email: 'REQUIRED',
      terms: 'REQUIRED',
    });
  });

  it('flags a malformed email alone', () => {
    expect(validateContactFields({ ...valid, email: 'nope' })).toEqual({
      email: 'INVALID',
    });
  });
});

describe('validateBookingContactFields (booking / private request)', () => {
  it('passes a valid contact', () => {
    expect(
      validateBookingContactFields({
        contactName: 'Nguyen Van A',
        contactEmail: 'a@b.com',
      }),
    ).toEqual({});
  });

  it('flags both fields when empty', () => {
    expect(
      validateBookingContactFields({ contactName: '', contactEmail: '' }),
    ).toEqual({ contactName: 'REQUIRED', contactEmail: 'REQUIRED' });
  });

  it('mirrors the payload builder rule (name ≥ 2 chars, email shape)', () => {
    expect(
      validateBookingContactFields({ contactName: 'A', contactEmail: 'x@y' }),
    ).toEqual({ contactName: 'REQUIRED', contactEmail: 'INVALID' });
  });
});

describe('validateReviewFields (review-creation form)', () => {
  const valid = { rating: 5, title: 'Great trip', body: '1234567890' };

  it('passes a valid form (optional title)', () => {
    expect(validateReviewFields(valid)).toEqual({});
    expect(validateReviewFields({ ...valid, title: '' })).toEqual({});
  });

  it('flags rating 0 and 6 as RATING_REQUIRED (only 1-5 is valid)', () => {
    expect(validateReviewFields({ ...valid, rating: 0 }).rating).toBe(
      'RATING_REQUIRED',
    );
    expect(validateReviewFields({ ...valid, rating: 6 }).rating).toBe(
      'RATING_REQUIRED',
    );
    expect(
      validateReviewFields({ ...valid, rating: 1 }).rating,
    ).toBeUndefined();
    expect(
      validateReviewFields({ ...valid, rating: 5 }).rating,
    ).toBeUndefined();
  });

  it('flags an empty body as BODY_REQUIRED', () => {
    expect(validateReviewFields({ ...valid, body: '' }).body).toBe(
      'BODY_REQUIRED',
    );
    expect(validateReviewFields({ ...valid, body: '   ' }).body).toBe(
      'BODY_REQUIRED',
    );
  });

  it('flags body boundary lengths (9 too short, 10 ok, 2000 ok, 2001 too long)', () => {
    expect(validateReviewFields({ ...valid, body: 'a'.repeat(9) }).body).toBe(
      'BODY_TOO_SHORT',
    );
    expect(
      validateReviewFields({ ...valid, body: 'a'.repeat(10) }).body,
    ).toBeUndefined();
    expect(
      validateReviewFields({ ...valid, body: 'a'.repeat(2000) }).body,
    ).toBeUndefined();
    expect(
      validateReviewFields({ ...valid, body: 'a'.repeat(2001) }).body,
    ).toBe('BODY_TOO_LONG');
  });

  it('flags title boundary lengths (120 ok, 121 too long)', () => {
    expect(
      validateReviewFields({ ...valid, title: 'a'.repeat(120) }).title,
    ).toBeUndefined();
    expect(
      validateReviewFields({ ...valid, title: 'a'.repeat(121) }).title,
    ).toBe('TITLE_TOO_LONG');
  });

  it('is total on crafted non-string input (server actions are public endpoints)', () => {
    const crafted = {
      rating: '5',
      title: null,
      body: undefined,
    } as unknown as Parameters<typeof validateReviewFields>[0];
    const errors = validateReviewFields(crafted);
    expect(errors.rating).toBe('RATING_REQUIRED');
    expect(errors.body).toBe('BODY_REQUIRED');
    expect(errors.title).toBeUndefined();
  });
});
