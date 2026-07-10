import type { EnquiryPayload } from '@tourism/core';

import { getApiClient } from './client';

export type EnquiryResult = { ok: true } | { ok: false; rateLimited: boolean };

export async function submitEnquiry(
  payload: EnquiryPayload,
): Promise<EnquiryResult> {
  try {
    const api = getApiClient();
    const { error, response } = await api.POST('/api/v1/enquiries', {
      body: payload,
    });
    if (error || !response.ok) {
      return { ok: false, rateLimited: response?.status === 429 };
    }
    return { ok: true };
  } catch {
    return { ok: false, rateLimited: false };
  }
}
