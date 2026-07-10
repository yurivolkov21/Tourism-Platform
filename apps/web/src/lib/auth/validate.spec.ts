import {
  validateEmailField,
  validateLoginFields,
  validateResetFields,
  validateSignUpFields,
} from './validate';

describe('validateEmailField', () => {
  it('accepts a plausible address', () => {
    expect(validateEmailField('you@example.com')).toBeNull();
  });

  it('trims surrounding whitespace before checking', () => {
    expect(validateEmailField('  you@example.com  ')).toBeNull();
  });

  it('requires a value (empty or whitespace-only)', () => {
    expect(validateEmailField('')).toBe('REQUIRED');
    expect(validateEmailField('   ')).toBe('REQUIRED');
  });

  it('rejects a malformed address', () => {
    expect(validateEmailField('not-an-email')).toBe('INVALID');
    expect(validateEmailField('you@example')).toBe('INVALID');
    expect(validateEmailField('you @example.com')).toBe('INVALID');
  });
});

describe('validateLoginFields', () => {
  it('passes a filled form', () => {
    expect(
      validateLoginFields({ email: 'you@example.com', password: 'x' }),
    ).toEqual({});
  });

  it('flags both fields when empty', () => {
    expect(validateLoginFields({ email: '', password: '' })).toEqual({
      email: 'REQUIRED',
      password: 'REQUIRED',
    });
  });

  it('flags a malformed email', () => {
    expect(
      validateLoginFields({ email: 'nope', password: 'secret123' }),
    ).toEqual({ email: 'INVALID' });
  });

  it('does not apply the min-length policy to an existing password', () => {
    expect(
      validateLoginFields({ email: 'you@example.com', password: 'abc' }),
    ).toEqual({});
  });
});

describe('validateSignUpFields', () => {
  const valid = {
    fullName: 'Nguyen Van A',
    email: 'you@example.com',
    password: 'secret123',
    confirm: 'secret123',
  };

  it('passes a valid form', () => {
    expect(validateSignUpFields(valid)).toEqual({});
  });

  it('flags every empty field at once', () => {
    expect(
      validateSignUpFields({
        fullName: '',
        email: '',
        password: '',
        confirm: '',
      }),
    ).toEqual({
      fullName: 'REQUIRED',
      email: 'REQUIRED',
      password: 'REQUIRED',
      confirm: 'REQUIRED',
    });
  });

  it('treats a one-character name as missing', () => {
    expect(validateSignUpFields({ ...valid, fullName: ' A ' })).toEqual({
      fullName: 'REQUIRED',
    });
  });

  it('flags a too-short password on the password field', () => {
    expect(
      validateSignUpFields({ ...valid, password: 'abc', confirm: 'abc' }),
    ).toEqual({ password: 'TOO_SHORT' });
  });

  it('flags a mismatch on the confirm field', () => {
    expect(validateSignUpFields({ ...valid, confirm: 'secret124' })).toEqual({
      confirm: 'MISMATCH',
    });
  });
});

describe('validateResetFields', () => {
  it('passes a valid pair', () => {
    expect(
      validateResetFields({ password: 'secret123', confirm: 'secret123' }),
    ).toEqual({});
  });

  it('flags empty fields as required (not too-short)', () => {
    expect(validateResetFields({ password: '', confirm: '' })).toEqual({
      password: 'REQUIRED',
      confirm: 'REQUIRED',
    });
  });

  it('flags a too-short password', () => {
    expect(validateResetFields({ password: 'abc', confirm: 'abc' })).toEqual({
      password: 'TOO_SHORT',
    });
  });

  it('flags a mismatch on the confirm field', () => {
    expect(
      validateResetFields({ password: 'secret123', confirm: 'secret124' }),
    ).toEqual({ confirm: 'MISMATCH' });
  });
});
