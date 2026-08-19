/** Pure mapper from the profile form to the `PATCH /users/me` body (trim, drop empties). */

export interface ProfileFormRaw {
  fullName: string;
  phone: string;
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
