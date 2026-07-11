'use server';

import { revalidatePath } from 'next/cache';

import { apiWrite, getApiClient } from '../api/client';
import { apiErrorMessage } from '../api/error';
import type { UserRole } from './data';

/** Changes a user's role (`PATCH /admin/users/:id/role`); guards (409): self / env-admin / last-admin. */
export async function changeUserRole(
  id: string,
  role: UserRole,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiWrite(
      'PATCH',
      `/api/v1/admin/users/${encodeURIComponent(id)}/role`,
      { role },
    );
    revalidatePath('/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

/** Deletes a customer account (`DELETE /admin/users/:id`); guards (409): self / admin / bookings / posts. */
export async function deleteUser(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const api = await getApiClient();
    const { error } = await api.DELETE('/api/v1/admin/users/{id}', {
      params: { path: { id } },
    });
    if (error) return { ok: false, error: apiErrorMessage(error) };
    revalidatePath('/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

export interface UpdateOwnProfileState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Updates the caller's own name/phone (`PATCH /users/me` — the public self-service endpoint, not an
 * admin-only route). Validates a strict superset of `UpdateMeDto` (which caps fullName at 120 with no minimum; phone 6–20 when
 * present) so a bad value never round-trips to the API. `phone` has no "clear" path: `UpdateMeDto`
 * has no null variant, so a blanked field is simply omitted from the body (the stored value stands)
 * rather than sent as `''`, which would fail the API's `@Length(6, 20)` validator.
 */
export async function updateOwnProfile(
  formData: FormData,
): Promise<UpdateOwnProfileState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 120) {
    fieldErrors.fullName = 'Enter a name between 2 and 120 characters.';
  }
  if (phone && (phone.length < 6 || phone.length > 20)) {
    fieldErrors.phone = 'Phone must be 6–20 characters.';
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await apiWrite('PATCH', '/api/v1/users/me', {
      fullName,
      ...(phone ? { phone } : {}),
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/users/me');
  return {};
}
