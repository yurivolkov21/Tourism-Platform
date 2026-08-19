import { validateChangePassword } from './change-password';

test('accepts an 8+ char password with a matching confirm', () => {
  expect(
    validateChangePassword({ password: 'secret123', confirm: 'secret123' }),
  ).toEqual({});
});

test('flags a too-short password', () => {
  expect(
    validateChangePassword({ password: 'short', confirm: 'short' }),
  ).toEqual({ password: 'passwordTooShort' });
});

test('flags a mismatched confirm only once the password itself is valid', () => {
  expect(
    validateChangePassword({ password: 'secret123', confirm: 'different' }),
  ).toEqual({ confirm: 'confirmMismatch' });
});
