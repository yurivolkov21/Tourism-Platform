'use server';

import { revalidatePath } from 'next/cache';

import { apiErrorMessage } from '../api/error';
import { apiWrite } from '../api/client';
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
