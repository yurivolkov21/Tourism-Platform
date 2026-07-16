import { canChangeEmail } from './can-change-email';

describe('canChangeEmail', () => {
  it('allows a password-only account', () => {
    expect(canChangeEmail(['email'])).toBe(true);
  });

  it('blocks a Google-only account', () => {
    expect(canChangeEmail(['google'])).toBe(false);
  });

  it('blocks a password + Google (same-email) account', () => {
    expect(canChangeEmail(['email', 'google'])).toBe(false);
    expect(canChangeEmail(['google', 'email'])).toBe(false);
  });

  it('blocks when no providers are known (conservative)', () => {
    expect(canChangeEmail([])).toBe(false);
  });
});
