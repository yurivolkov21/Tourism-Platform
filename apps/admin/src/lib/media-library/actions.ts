'use server';

import { revalidatePath } from 'next/cache';

import { apiWrite, getApiClient } from '../api/client';
import { apiErrorMessage } from '../api/error';

/** Detaches one asset + queues its Cloudinary destruction. */
export async function deleteMediaAsset(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const api = await getApiClient();
    const { error } = await api.DELETE('/api/v1/admin/media/{id}', {
      params: { path: { id } },
    });
    if (error) return { ok: false, error: apiErrorMessage(error) };
    revalidatePath('/media');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

/** Runs one Cloudinary cleanup batch immediately. */
export async function runMediaCleanup(): Promise<{
  ok: boolean;
  destroyed?: number;
  failed?: number;
  error?: string;
}> {
  try {
    const result = await apiWrite<{ destroyed: number; failed: number }>(
      'POST',
      '/api/v1/admin/media/garbage/reconcile',
    );
    revalidatePath('/media');
    return { ok: true, destroyed: result.destroyed, failed: result.failed };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}
