'use server';

import { revalidatePath } from 'next/cache';

import { getApiClient } from '../api/client';
import { apiErrorMessage } from '../api/error';

/**
 * Removes a newsletter subscriber (`DELETE /admin/newsletter/subscribers/:id`, hard delete — the
 * model has no soft-unsubscribe field). Re-subscribing on the public site simply re-creates the row.
 */
export async function removeSubscriber(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const api = await getApiClient();
    const { error } = await api.DELETE(
      '/api/v1/admin/newsletter/subscribers/{id}',
      { params: { path: { id } } },
    );
    if (error) return { ok: false, error: apiErrorMessage(error) };
    revalidatePath('/subscribers');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}
