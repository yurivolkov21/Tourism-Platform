import { meetsPasswordPolicy, scorePassword } from './password-policy';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Server/flow-level failures — what went wrong AFTER a valid form was submitted. */
export type AuthErrorKey =
  | 'invalidCredentials'
  | 'wrongPassword'
  | 'emailTaken'
  | 'samePassword'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'providerAlreadyLinked'
  | 'manualLinkingDisabled'
  | 'rateLimited'
  | 'network'
  | 'generic'
  | 'cancelled';

/**
 * Per-field failures — what the user typed wrong, named precisely enough that
 * the message can say WHICH field and WHY (a blank email and a malformed one
 * are different mistakes, and so are "too short" and "missing a number").
 */
export type FieldErrorKey =
  | 'nameRequired'
  | 'nameTooLong'
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordPolicy'
  | 'passwordUnchanged'
  | 'confirmRequired'
  | 'confirmMismatch'
  | 'phoneInvalid';

/** Display names are stored on the API as a plain string — keep it sane. */
export const MAX_NAME = 60;

/** Digits only after stripping the punctuation a phone number may legitimately carry. */
const PHONE_ALLOWED_RE = /^[\d\s+()./-]+$/;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

/** Blank vs malformed are different mistakes — say which. */
function checkEmail(email: string): 'emailRequired' | 'emailInvalid' | null {
  const trimmed = email.trim();
  if (trimmed === '') return 'emailRequired';
  return EMAIL_RE.test(trimmed) ? null : 'emailInvalid';
}

/**
 * Blank → "enter one"; short-only → "N more characters"; anything else unmet →
 * point at the requirements checklist rather than repeating it in one line.
 */
function checkNewPassword(
  password: string,
): 'passwordRequired' | 'passwordTooShort' | 'passwordPolicy' | null {
  if (password === '') return 'passwordRequired';
  if (meetsPasswordPolicy(password)) return null;
  const unmet = scorePassword(password).rules.filter((r) => !r.met);
  return unmet.length === 1 && unmet[0].key === 'length'
    ? 'passwordTooShort'
    : 'passwordPolicy';
}

export function checkName(name: string): 'nameRequired' | 'nameTooLong' | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'nameRequired';
  return trimmed.length > MAX_NAME ? 'nameTooLong' : null;
}

/** Phone is optional; when given it must look like a dialable number. */
export function checkPhone(phone: string): 'phoneInvalid' | null {
  const trimmed = phone.trim();
  if (trimmed === '') return null;
  if (!PHONE_ALLOWED_RE.test(trimmed)) return 'phoneInvalid';
  const digits = trimmed.replace(/\D/g, '').length;
  return digits < MIN_PHONE_DIGITS || digits > MAX_PHONE_DIGITS
    ? 'phoneInvalid'
    : null;
}

export type SignInErrors = Partial<Record<'email' | 'password', FieldErrorKey>>;
export type SignUpErrors = Partial<
  Record<'fullName' | 'email' | 'password' | 'confirm', FieldErrorKey>
>;
export type ForgotErrors = Partial<Record<'email', FieldErrorKey>>;

/**
 * Sign-in stays lenient on the password: accounts created before the current
 * policy must still be able to log in, so only "did you type one" is checked.
 */
export function validateSignIn(input: {
  email: string;
  password: string;
}): SignInErrors {
  const errors: SignInErrors = {};
  const email = checkEmail(input.email);
  if (email) errors.email = email;
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
  const name = checkName(input.fullName);
  if (name) errors.fullName = name;
  const email = checkEmail(input.email);
  if (email) errors.email = email;
  const password = checkNewPassword(input.password);
  if (password) errors.password = password;
  // Checked independently of the password's own validity: blurring confirm
  // while the password is still weak must not silently clear a real mismatch.
  if (input.confirm === '') errors.confirm = 'confirmRequired';
  else if (input.confirm !== input.password) errors.confirm = 'confirmMismatch';
  return errors;
}

export function validateForgot(input: { email: string }): ForgotErrors {
  const email = checkEmail(input.email);
  return email ? { email } : {};
}

/**
 * Re-runs a form's validator but adopts only ONE field's verdict, leaving the
 * other fields' current errors untouched. This is what makes on-blur validation
 * behave: leaving the email field must not light up the password field the user
 * hasn't reached yet, and fixing a field must clear its own error.
 */
export function mergeFieldError<E extends object, K extends keyof E>(
  previous: E,
  fresh: E,
  field: K,
): E {
  const merged = { ...previous };
  if (fresh[field] === undefined) delete merged[field];
  else merged[field] = fresh[field];
  return merged;
}

/**
 * Supabase auth error message → friendly copy key (defensive substring checks
 * against both the human message and the `error_code`, which is the stable half).
 */
export function mapAuthError(
  error:
    | { message?: string; code?: string; status?: number }
    | null
    | undefined,
): AuthErrorKey {
  const message = error?.message?.toLowerCase() ?? '';
  const code = error?.code?.toLowerCase() ?? '';
  if (code === 'same_password' || message.includes('should be different'))
    return 'samePassword';
  if (code === 'email_exists' || code === 'user_already_exists') {
    return 'emailTaken';
  }
  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'emailTaken';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed'))
    return 'emailNotConfirmed';
  if (
    code === 'identity_already_exists' ||
    message.includes('identity is already linked')
  ) {
    return 'providerAlreadyLinked';
  }
  if (code === 'manual_linking_disabled') return 'manualLinkingDisabled';
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'rateLimited';
  }
  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error')
  ) {
    return 'network';
  }
  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials')
  ) {
    return 'invalidCredentials';
  }
  if (code === 'weak_password' || message.includes('password should be'))
    return 'weakPassword';
  return 'generic';
}
