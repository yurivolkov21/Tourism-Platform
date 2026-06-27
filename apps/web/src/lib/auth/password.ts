/** Shared password-pair validation for the register + reset-password forms (copy lives in i18n). */

export const MIN_PASSWORD = 6;

export type PasswordError = 'TOO_SHORT' | 'MISMATCH';

/** `null` when valid; otherwise a stable error code the form maps to `messages.auth.passwordErrors`. */
export function validatePasswordPair(password: string, confirm: string): PasswordError | null {
  if (password.length < MIN_PASSWORD) return 'TOO_SHORT';
  if (password !== confirm) return 'MISMATCH';
  return null;
}
