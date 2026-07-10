import type { EnquiryPayload } from '../enquiry-form';
import { getApiClient } from './client';

export type EnquiryResult = { ok: true } | { ok: false; rateLimited: boolean };

/**
 * Submit a lead to `POST /api/v1/enquiries` from the browser (client-side on
 * purpose: the API throttles per-IP, so each visitor gets their own 5/min budget
 * rather than funnelling every lead through one server IP). Never throws — returns
 * a result the form can render. A 429 maps to `rateLimited` for a tailored message.
 */
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
