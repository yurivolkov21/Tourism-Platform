import type { AuthErrorKey, FieldErrorKey } from './auth';
import { meetsPasswordPolicy, scorePassword } from './password-policy';

/**
 * Values are keys into `messages.mobile.authErrors`. `AuthErrorKey` is in the
 * union because the server's verdict on the current password (`wrongPassword`)
 * belongs ON that field, not in a detached banner.
 */
export type ChangePasswordErrors = Partial<
  Record<
    'currentPassword' | 'password' | 'confirm',
    FieldErrorKey | AuthErrorKey
  >
>;

/**
 * Same rule as sign-up's password/confirm pair — the full policy from
 * `password-policy.ts`, with every verdict kept independent so blurring one
 * field never clears another's error.
 *
 * `requireCurrent` mirrors the account's providers: an account that signs in
 * with a password must prove it still knows it (an unlocked device must not be
 * enough to take the account over), while a Google-only account is setting its
 * first password and has none to prove.
 */
export function validateChangePassword(input: {
  password: string;
  confirm: string;
  currentPassword?: string;
  requireCurrent?: boolean;
}): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};
  if (input.requireCurrent && !input.currentPassword)
    errors.currentPassword = 'passwordRequired';
  if (input.password === '') errors.password = 'passwordRequired';
  else if (!meetsPasswordPolicy(input.password)) {
    const unmet = scorePassword(input.password).rules.filter((r) => !r.met);
    errors.password =
      unmet.length === 1 && unmet[0].key === 'length'
        ? 'passwordTooShort'
        : 'passwordPolicy';
  } else if (
    input.requireCurrent &&
    input.currentPassword &&
    input.password === input.currentPassword
  ) {
    // Caught here rather than at Supabase, whose `same_password` only fires
    // against the password actually on record.
    errors.password = 'passwordUnchanged';
  }
  if (input.confirm === '') errors.confirm = 'confirmRequired';
  else if (input.confirm !== input.password) errors.confirm = 'confirmMismatch';
  return errors;
}
