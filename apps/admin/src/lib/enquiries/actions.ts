'use server';

import { revalidatePath } from 'next/cache';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import type { EnquiryNote } from './data';
import type { EnquiryStatus } from './status';

export interface UpdateEnquiryStatusState {
  error?: string;
}

/**
 * Moves an enquiry along the CRM pipeline (`PATCH /admin/enquiries/:id/status`). Returns a friendly
 * message on failure so the drawer can surface it inline without navigating away.
 */
export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus,
): Promise<UpdateEnquiryStatusState> {
  try {
    await apiWrite(
      'PATCH',
      `/api/v1/admin/enquiries/${encodeURIComponent(id)}/status`,
      { status },
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/enquiries');
  return {};
}

/**
 * Lists an enquiry's internal notes thread (`GET /admin/enquiries/:id/notes`, oldest first). A
 * server action (not a `data.ts` read) because the drawer — a Client Component — calls it directly
 * on open; the endpoint returns a plain array, wrapped in the `{ data, error }` envelope at runtime,
 * so we unwrap `.data` (the generated client types it bare) — same convention as `listDepartures`.
 */
export async function listEnquiryNotes(
  enquiryId: string,
): Promise<EnquiryNote[]> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/enquiries/{id}/notes', {
    params: { path: { id: enquiryId } },
  });
  return (data as unknown as { data: EnquiryNote[] }).data;
}

export interface AddEnquiryNoteState {
  note?: EnquiryNote;
  error?: string;
}

/**
 * Appends an internal note to an enquiry (`POST /admin/enquiries/:id/notes`). Returns the created
 * note (author + timestamp stamped server-side) on success, or a friendly message on failure so the
 * drawer can roll back its optimistic entry without navigating away.
 */
export async function addEnquiryNote(
  enquiryId: string,
  body: string,
): Promise<AddEnquiryNoteState> {
  let note: EnquiryNote;
  try {
    note = await apiWrite<EnquiryNote>(
      'POST',
      `/api/v1/admin/enquiries/${encodeURIComponent(enquiryId)}/notes`,
      { body },
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/enquiries');
  return { note };
}
