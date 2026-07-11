'use server';

import { revalidatePath } from 'next/cache';

import { apiWrite, getApiClient } from '../api/client';
import { apiErrorMessage } from '../api/error';
import { listMedia, type MediaList, type MediaListParams } from './data';

/**
 * Images-only library read for the "Choose from library" picker (`MediaField`) — a thin wrapper
 * over {@link listMedia} that's importable from a Client Component (mirrors the enquiries
 * notes-drawer `listEnquiryNotes` pattern: a Client Component calls the server action directly on
 * open). `type` is always forced to `IMAGE` — the picker never offers videos.
 */
export async function listLibraryMedia(
  params: Omit<MediaListParams, 'type'> = {},
): Promise<{ data?: MediaList; error?: string }> {
  try {
    // Images only, and never customer avatars — the picker offers brand/content
    // assets, not user photos.
    const data = await listMedia({
      ...params,
      type: 'IMAGE',
      excludeUserOwned: true,
    });
    return { data };
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
}

/** Sets or clears (`null`) one asset's alt text (`PATCH /admin/media/:id`). */
export async function updateMediaAlt(
  id: string,
  alt: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiWrite('PATCH', `/api/v1/admin/media/${encodeURIComponent(id)}`, {
      alt,
    });
    revalidatePath('/media');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

/**
 * Bulk-deletes library assets (`POST /admin/media/bulk-delete`). USER-owned rows are skipped by
 * the server (not failed) — `skipped` reports how many, so the caller can summarize both counts.
 */
export async function bulkDeleteMedia(ids: string[]): Promise<{
  ok: boolean;
  deleted?: number;
  skipped?: number;
  error?: string;
}> {
  try {
    const result = await apiWrite<{ deleted: number; skipped: number }>(
      'POST',
      '/api/v1/admin/media/bulk-delete',
      { ids },
    );
    revalidatePath('/media');
    return { ok: true, deleted: result.deleted, skipped: result.skipped };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

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
