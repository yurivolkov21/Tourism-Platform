/**
 * Per-field validation for the auth forms (login / register / forgot / reset). Forms are
 * `noValidate` — the browser's native bubbles are off, so these stable codes are the single
 * source of field errors; the forms map them to copy via `messages.auth.fieldErrors`.
 * The register form runs this inside the `signUp` server action (server-side); the
 * Supabase-in-the-browser forms run it in their submit handlers with the same codes.
 */

import { validateEmailField, type FieldErrorCode } from '../forms/validate';
import { validatePasswordPair } from './password';

// The generic base lives in `lib/forms/validate.ts`; re-exported so auth consumers keep one import.
export { validateEmailField };
export type { FieldErrorCode };

export type LoginFieldErrors = Partial<
  Record<'email' | 'password', FieldErrorCode>
>;

/** Login only checks presence/shape — the min-length policy never blocks an existing password. */
export function validateLoginFields(fields: {
  email: string;
  password: string;
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = validateEmailField(fields.email);
  if (email) errors.email = email;
  if (!fields.password) errors.password = 'REQUIRED';
  return errors;
}

export type ResetFieldErrors = Partial<
  Record<'password' | 'confirm', FieldErrorCode>
>;

/** New-password pair: empty reads as REQUIRED; the policy checks reuse `validatePasswordPair`. */
export function validateResetFields(fields: {
  password: string;
  confirm: string;
}): ResetFieldErrors {
  const errors: ResetFieldErrors = {};
  if (!fields.password) errors.password = 'REQUIRED';
  if (!fields.confirm) errors.confirm = 'REQUIRED';
  if (errors.password || errors.confirm) return errors;

  const pair = validatePasswordPair(fields.password, fields.confirm);
  if (pair === 'TOO_SHORT') errors.password = 'TOO_SHORT';
  else if (pair === 'MISMATCH') errors.confirm = 'MISMATCH';
  return errors;
}

export type SignUpFieldErrors = Partial<
  Record<'fullName' | 'email' | 'password' | 'confirm', FieldErrorCode>
>;

export function validateSignUpFields(fields: {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
}): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};
  if (fields.fullName.trim().length < 2) errors.fullName = 'REQUIRED';
  const email = validateEmailField(fields.email);
  if (email) errors.email = email;
  return { ...errors, ...validateResetFields(fields) };
}
