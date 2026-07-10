'use server';

import { revalidatePath } from 'next/cache';

import { apiErrorMessage } from '../api/error';
import { apiWrite } from '../api/client';
import type { MediaPayload } from '../media';

export interface AppearanceActionState {
  error?: string;
}

/**
 * Replace a brand-chrome slot's media set (`PUT /admin/site-media/:key/media`).
 * An empty set resets the slot — the web falls back to its built-in default.
 */
export async function setSlotMedia(
  key: string,
  media: MediaPayload[],
): Promise<AppearanceActionState> {
  try {
    await apiWrite(
      'PUT',
      `/api/v1/admin/site-media/${encodeURIComponent(key)}/media`,
      { media },
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/appearance');
  return {};
}
