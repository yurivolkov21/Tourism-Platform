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

  it('maps a weak password', () => {
    expect(authErrorMessage({ code: 'weak_password', message: 'x' })).toBe(
      'Password is too weak — use at least 6 characters.',
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
