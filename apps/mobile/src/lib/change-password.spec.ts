import { validateChangePassword } from './change-password';

const STRONG = 'Secret12!';

test('accepts a policy-compliant password with a matching confirm', () => {
  expect(validateChangePassword({ password: STRONG, confirm: STRONG })).toEqual(
    {},
  );
});

test('flags a too-short password when length is the only unmet rule', () => {
  expect(validateChangePassword({ password: 'Ab1!', confirm: 'Ab1!' })).toEqual(
    { password: 'passwordTooShort' },
  );
});

test('flags a long-but-weak password against the requirements checklist', () => {
  expect(
    validateChangePassword({ password: 'secret123', confirm: 'secret123' }),
  ).toEqual({ password: 'passwordPolicy' });
});

test('flags an empty password and an empty confirm separately', () => {
  expect(validateChangePassword({ password: '', confirm: '' })).toEqual({
    password: 'passwordRequired',
    confirm: 'confirmRequired',
  });
});

test('flags a mismatched confirm even while the password is still weak', () => {
  expect(
    validateChangePassword({ password: 'weak', confirm: 'different' }),
  ).toEqual({ password: 'passwordPolicy', confirm: 'confirmMismatch' });
  expect(
    validateChangePassword({ password: STRONG, confirm: 'different' }),
  ).toEqual({ confirm: 'confirmMismatch' });
});

// ── Re-auth on password change (2026-08-27) ────────────────────────────────

test('requires the current password when the account already has one', () => {
  expect(
    validateChangePassword({
      password: STRONG,
      confirm: STRONG,
      currentPassword: '',
      requireCurrent: true,
    }),
  ).toEqual({ currentPassword: 'passwordRequired' });
});

test('a Google-only account is setting its first password, so none is required', () => {
  expect(
    validateChangePassword({
      password: STRONG,
      confirm: STRONG,
      requireCurrent: false,
    }),
  ).toEqual({});
});

test('rejects a "new" password identical to the current one', () => {
  expect(
    validateChangePassword({
      password: STRONG,
      confirm: STRONG,
      currentPassword: STRONG,
      requireCurrent: true,
    }),
  ).toEqual({ password: 'passwordUnchanged' });
});
