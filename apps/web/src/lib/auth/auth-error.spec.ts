import { authErrorMessage } from './auth-error';

describe('authErrorMessage', () => {
  it('maps invalid credentials (by message)', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Incorrect email or password.',
    );
  });

  it('maps invalid credentials (by code)', () => {
    expect(
      authErrorMessage({ code: 'invalid_credentials', message: 'x' }),
    ).toBe('Incorrect email or password.');
  });

  it('maps unconfirmed email', () => {
    expect(authErrorMessage(new Error('Email not confirmed'))).toBe(
      'Please confirm your email before signing in.',
    );
  });

  it('maps already-registered', () => {
    expect(authErrorMessage(new Error('User already registered'))).toBe(
      'That email is already registered.',
    );
  });

  it('maps same-password (new equals current) — not "too weak"', () => {
    // Regression: Supabase's message contains "password should be", which used to
    // be mislabelled as a weak-password / 6-char error.
    expect(
      authErrorMessage({
        code: 'same_password',
        message: 'New password should be different from the old password',
      }),
    ).toBe('Your new password must be different from your current password.');
  });

  it('surfaces the Supabase reason for a weak password', () => {
    const err = Object.assign(
      new Error('Password should contain at least one symbol.'),
      { code: 'weak_password' },
    );
    expect(authErrorMessage(err)).toBe(
      'Password should contain at least one symbol.',
    );
  });

  it('falls back for a weak password with no message', () => {
    expect(authErrorMessage({ code: 'weak_password', message: '' })).toBe(
      'Password is too weak — please choose a stronger one.',
    );
  });

  it('maps rate limiting', () => {
    expect(authErrorMessage(new Error('Email rate limit exceeded'))).toBe(
      'Too many attempts — please wait a moment and try again.',
    );
  });

  it('passes through an unknown error message', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back for non-errors', () => {
    expect(authErrorMessage(null)).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
