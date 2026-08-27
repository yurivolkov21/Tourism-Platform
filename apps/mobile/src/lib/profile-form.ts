/** Pure mapper from the profile form to the `PATCH /users/me` body (trim, drop empties). */

import { checkName, checkPhone, type FieldErrorKey } from './auth';

export interface ProfileFormRaw {
  fullName: string;
  phone: string;
}

export type ProfileErrors = Partial<
  Record<'fullName' | 'phone', FieldErrorKey>
>;

/**
 * Validates the personal-details pair before saving. The screen used to have no
 * validation at all: an empty name only greyed the Save button out (never saying
 * why), and a malformed phone went to the server, whose failure surfaced as a
 * message blaming the *name* field.
 */
export function validateProfile(raw: ProfileFormRaw): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = checkName(raw.fullName);
  if (name) errors.fullName = name;
  const phone = checkPhone(raw.phone);
  if (phone) errors.phone = phone;
  return errors;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
}

/** Trim + include only non-empty fields (set-only: a blank field is omitted, not cleared). */
export function buildUpdateProfilePayload(
  raw: ProfileFormRaw,
): UpdateProfilePayload {
  const payload: UpdateProfilePayload = {};
  const fullName = raw.fullName?.trim();
  const phone = raw.phone?.trim();
  if (fullName) payload.fullName = fullName;
  if (phone) payload.phone = phone;
  return payload;
}
