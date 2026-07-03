'use server';

import { revalidatePath } from 'next/cache';

import { apiWrite } from '../api/client';
import { apiErrorMessage } from '../api/error';

/** Resets a FAILED outbox row to PENDING for the next drain tick. */
export async function retryOutbox(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiWrite('POST', `/api/v1/admin/outbox/${encodeURIComponent(id)}/retry`);
    revalidatePath('/outbox');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}
