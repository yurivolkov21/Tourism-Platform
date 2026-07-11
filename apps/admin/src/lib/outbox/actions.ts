'use server';

import { revalidatePath } from 'next/cache';

import { apiWrite, getApiClient } from '../api/client';
import { apiErrorMessage } from '../api/error';

/** Resets a FAILED outbox row to PENDING for the next drain tick. */
export async function retryOutbox(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiWrite(
      'POST',
      `/api/v1/admin/outbox/${encodeURIComponent(id)}/retry`,
    );
    revalidatePath('/outbox');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

/**
 * Deletes a queued/poisoned outbox row (`DELETE /admin/outbox/:id`) — PENDING/FAILED only. `SENT`
 * rows are delivery audit history and the API 409s (`OUTBOX_ROW_SENT`); `apiErrorMessage` maps that
 * to a friendly toast.
 */
export async function deleteOutboxRow(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const api = await getApiClient();
    const { error } = await api.DELETE('/api/v1/admin/outbox/{id}', {
      params: { path: { id } },
    });
    if (error) return { ok: false, error: apiErrorMessage(error) };
    revalidatePath('/outbox');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}
