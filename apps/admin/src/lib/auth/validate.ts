/**
 * Per-field validation for the admin sign-in form. The form is `noValidate` — these messages
 * are the single source of presence/shape errors (server-side in the `signIn` action); real
 * auth failures still come from Supabase / the admin-sync API as the form-level error.
 */

export type SignInFieldErrors = Partial<Record<'email' | 'password', string>>;

/** Pragmatic shape check (`local@domain.tld`, no spaces) — deliverability is Supabase's job. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignInFields(fields: {
  email: string;
  password: string;
}): SignInFieldErrors {
  const errors: SignInFieldErrors = {};
  const email = fields.email.trim();
  if (!email) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!fields.password) errors.password = 'Enter your password.';
  return errors;
}
