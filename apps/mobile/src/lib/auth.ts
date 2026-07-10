const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthErrorKey =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'weakPassword'
  | 'generic';

export type SignInErrors = Partial<
  Record<'email' | 'password', 'emailInvalid' | 'passwordRequired'>
>;
export type SignUpErrors = Partial<
  Record<
    'fullName' | 'email' | 'password' | 'confirm',
    'nameRequired' | 'emailInvalid' | 'passwordTooShort' | 'confirmMismatch'
  >
>;

export function validateSignIn(input: {
  email: string;
  password: string;
}): SignInErrors {
  const errors: SignInErrors = {};
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'emailInvalid';
  if (input.password === '') errors.password = 'passwordRequired';
  return errors;
}

export function validateSignUp(input: {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
}): SignUpErrors {
  const errors: SignUpErrors = {};
  if (input.fullName.trim() === '') errors.fullName = 'nameRequired';
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'emailInvalid';
  if (input.password.length < 8) errors.password = 'passwordTooShort';
  else if (input.confirm !== input.password) errors.confirm = 'confirmMismatch';
  return errors;
}

export function validateForgot(input: {
  email: string;
}): Partial<Record<'email', 'emailInvalid'>> {
  return EMAIL_RE.test(input.email.trim()) ? {} : { email: 'emailInvalid' };
}

/** Supabase auth error message → friendly copy key (defensive substring checks). */
export function mapAuthError(
  error: { message?: string } | null | undefined,
): AuthErrorKey {
  const message = error?.message?.toLowerCase() ?? '';
  if (message.includes('invalid login credentials'))
    return 'invalidCredentials';
  if (message.includes('already registered')) return 'emailTaken';
  if (message.includes('password should be')) return 'weakPassword';
  return 'generic';
}
