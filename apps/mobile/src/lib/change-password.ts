export type ChangePasswordErrors = Partial<
  Record<'password' | 'confirm', 'passwordTooShort' | 'confirmMismatch'>
>;

/** Same rule as sign-up's password/confirm pair — 8+ chars, confirm must match. */
export function validateChangePassword(input: {
  password: string;
  confirm: string;
}): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {};
  if (input.password.length < 8) errors.password = 'passwordTooShort';
  else if (input.confirm !== input.password) errors.confirm = 'confirmMismatch';
  return errors;
}
