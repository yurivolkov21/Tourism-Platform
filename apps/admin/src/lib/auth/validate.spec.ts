import { validateSignInFields } from './validate';

describe('validateSignInFields', () => {
  it('passes a filled form', () => {
    expect(
      validateSignInFields({ email: 'ops@nexora.com', password: 'x' }),
    ).toEqual({});
  });

  it('flags both fields when empty (whitespace email counts as empty)', () => {
    expect(validateSignInFields({ email: '  ', password: '' })).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
  });

  it('flags a malformed email', () => {
    expect(
      validateSignInFields({ email: 'not-an-email', password: 'secret' }),
    ).toEqual({ email: 'Enter a valid email address.' });
    expect(
      validateSignInFields({ email: 'ops@nexora', password: 'secret' }),
    ).toEqual({ email: 'Enter a valid email address.' });
  });

  it('never applies a length policy to the password (existing credentials)', () => {
    expect(
      validateSignInFields({ email: 'ops@nexora.com', password: 'a' }),
    ).toEqual({});
  });
});
