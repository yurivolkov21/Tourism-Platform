import { validateEmail, validatePassword, toAuthError } from './auth-helpers';

describe('validateEmail', () => {
  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('rejects string without @', () => {
    expect(validateEmail('nodomain')).toBe(false);
  });

  it('rejects string without dot in domain', () => {
    expect(validateEmail('a@nodot')).toBe(false);
  });

  it('rejects @ with nothing before it', () => {
    expect(validateEmail('@domain.com')).toBe(false);
  });

  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('a@b.co')).toBe(true);
  });

  it('accepts email with plus alias', () => {
    expect(validateEmail('user+tag@mail.org')).toBe(true);
  });
});

describe('validatePassword', () => {
  it('rejects password shorter than 8 chars', () => {
    expect(validatePassword('Ab1')).toBe(false);
  });

  it('rejects password with no uppercase', () => {
    expect(validatePassword('allower1')).toBe(false);
  });

  it('rejects password with no digit', () => {
    expect(validatePassword('AllGooddd')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validatePassword('')).toBe(false);
  });

  it('accepts valid password', () => {
    expect(validatePassword('AllGood1')).toBe(true);
  });

  it('accepts longer valid password', () => {
    expect(validatePassword('MySecurePass2024!')).toBe(true);
  });
});

describe('toAuthError', () => {
  it('maps invalid credentials', () => {
    const msg = toAuthError({ message: 'Invalid login credentials' });
    expect(msg).toBe('Invalid email or password.');
  });

  it('maps user already registered', () => {
    const msg = toAuthError({ message: 'User already registered' });
    expect(msg).toBe('An account with this email already exists.');
  });

  it('maps email not confirmed', () => {
    const msg = toAuthError({ message: 'Email not confirmed' });
    expect(msg).toBe('Please verify your email before signing in.');
  });

  it('maps too many requests', () => {
    const msg = toAuthError({
      message: 'For security purposes, you can only request this after 60 seconds.',
    });
    expect(msg).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('maps unknown error with fallback', () => {
    const msg = toAuthError({ message: 'some unknown XYZ error' });
    expect(msg).toBe('Something went wrong. Please try again.');
  });

  it('handles null/undefined gracefully', () => {
    const msg = toAuthError(null);
    expect(msg).toBe('Something went wrong. Please try again.');
  });
});
