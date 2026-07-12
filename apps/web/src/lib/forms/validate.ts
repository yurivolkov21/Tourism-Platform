/**
 * Generic per-field validation shared by every public web form (enquiry family, booking
 * contact, account security — the auth forms consume the base via `lib/auth/validate.ts`).
 * Forms are `noValidate`: these stable codes are the single source of field errors, mapped
 * to copy via `messages.fieldErrors` (or `messages.auth.fieldErrors` for the auth forms).
 * Presence/shape only — the API (or Supabase) stays the authority on real business errors.
 */

export type FieldErrorCode =
  | 'REQUIRED'
  | 'INVALID'
  | 'TOO_SHORT'
  | 'MISMATCH'
  | 'RATING_REQUIRED'
  | 'BODY_REQUIRED'
  | 'BODY_TOO_SHORT'
  | 'BODY_TOO_LONG'
  | 'TITLE_TOO_LONG';

/** Pragmatic shape check (`local@domain.tld`, no spaces) — deliverability is the BE's job. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailField(
  email: string,
): Extract<FieldErrorCode, 'REQUIRED' | 'INVALID'> | null {
  const trimmed = email.trim();
  if (!trimmed) return 'REQUIRED';
  if (!EMAIL_RE.test(trimmed)) return 'INVALID';
  return null;
}

/** Trimmed presence check; `minLength` folds "too short to be real" into REQUIRED (one message). */
export function validateRequiredText(
  value: string,
  minLength = 1,
): Extract<FieldErrorCode, 'REQUIRED'> | null {
  return value.trim().length < minLength ? 'REQUIRED' : null;
}

const MIN_NAME = 2;

export type EnquiryFieldErrors = Partial<
  Record<'name' | 'email', FieldErrorCode>
>;

/** Compact enquiry forms (EnquiryCta, PlanTrip): name + email; everything else is optional. */
export function validateEnquiryFields(fields: {
  name: string;
  email: string;
}): EnquiryFieldErrors {
  const errors: EnquiryFieldErrors = {};
  const name = validateRequiredText(fields.name, MIN_NAME);
  if (name) errors.name = name;
  const email = validateEmailField(fields.email);
  if (email) errors.email = email;
  return errors;
}

export type ContactFieldErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'terms', FieldErrorCode>
>;

/** Contact-page form: split name, email, and the terms checkbox. */
export function validateContactFields(fields: {
  firstName: string;
  lastName: string;
  email: string;
  terms: boolean;
}): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  const firstName = validateRequiredText(fields.firstName, MIN_NAME);
  if (firstName) errors.firstName = firstName;
  const lastName = validateRequiredText(fields.lastName);
  if (lastName) errors.lastName = lastName;
  const email = validateEmailField(fields.email);
  if (email) errors.email = email;
  if (!fields.terms) errors.terms = 'REQUIRED';
  return errors;
}

export type BookingContactFieldErrors = Partial<
  Record<'contactName' | 'contactEmail', FieldErrorCode>
>;

/**
 * Traveller contact on the booking + private-request forms. Mirrors (never replaces) the
 * `buildCreateBookingPayload` INVALID_CONTACT rule so the payload builder stays the backstop.
 */
export function validateBookingContactFields(fields: {
  contactName: string;
  contactEmail: string;
}): BookingContactFieldErrors {
  const errors: BookingContactFieldErrors = {};
  const contactName = validateRequiredText(fields.contactName, MIN_NAME);
  if (contactName) errors.contactName = contactName;
  const contactEmail = validateEmailField(fields.contactEmail);
  if (contactEmail) errors.contactEmail = contactEmail;
  return errors;
}

const MIN_BODY = 10;
const MAX_BODY = 2000;
const MAX_TITLE = 120;

export type ReviewFieldErrors = Partial<
  Record<'rating' | 'title' | 'body', FieldErrorCode>
>;

/**
 * "Rate this trip" review form: 1–5 rating required, body 10–2000 chars required, title ≤120
 * optional. Mirrors the BE's `CreateReviewDto` limits so the two can never disagree.
 */
export function validateReviewFields(fields: {
  rating: number;
  title: string;
  body: string;
}): ReviewFieldErrors {
  const errors: ReviewFieldErrors = {};
  if (
    !Number.isInteger(fields.rating) ||
    fields.rating < 1 ||
    fields.rating > 5
  ) {
    errors.rating = 'RATING_REQUIRED';
  }
  // Server actions are public POST endpoints — crafted payloads can carry
  // non-string values, so the validator must be total (never throw).
  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  if (title.length > MAX_TITLE) errors.title = 'TITLE_TOO_LONG';
  const body = typeof fields.body === 'string' ? fields.body.trim() : '';
  if (!body) errors.body = 'BODY_REQUIRED';
  else if (body.length < MIN_BODY) errors.body = 'BODY_TOO_SHORT';
  else if (body.length > MAX_BODY) errors.body = 'BODY_TOO_LONG';
  return errors;
}
