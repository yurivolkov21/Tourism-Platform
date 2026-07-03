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
    await apiWrite('PATCH', `/api/v1/admin/users/${encodeURIComponent(id)}/role`, { role });
    revalidatePath('/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

/** Deletes a customer account (`DELETE /admin/users/:id`); guards (409): self / admin / bookings / posts. */
export async function deleteUser(id: string): Promise<{ ok: boolean; error?: string }> {
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
