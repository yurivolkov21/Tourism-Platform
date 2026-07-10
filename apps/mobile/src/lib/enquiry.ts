import { ApiRequestError } from '@tourism/core';
import { getApiClient } from './api';

export interface EnquiryInput {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export type EnquiryErrorKey =
  | 'nameRequired'
  | 'emailInvalid'
  | 'messageRequired';
export type EnquiryFieldErrors = Partial<
  Record<'name' | 'email' | 'message', EnquiryErrorKey>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field-level validation returning i18n error KEYS (resolved to copy at render time). */
export function validateEnquiry(input: EnquiryInput): EnquiryFieldErrors {
  const errors: EnquiryFieldErrors = {};
  if (input.name.trim() === '') errors.name = 'nameRequired';
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'emailInvalid';
  if (input.message.trim() === '') errors.message = 'messageRequired';
  return errors;
}

export type EnquiryResult = { ok: true } | { ok: false; rateLimited: boolean };

/**
 * Submit a lead tied to a tour. Never throws — the modal renders the result.
 * A 429 (per-IP throttle, 5/min) maps to `rateLimited` for tailored copy (as web does).
 */
export async function submitEnquiry(
  input: EnquiryInput & { tourId: string },
): Promise<EnquiryResult> {
  const api = getApiClient();
  const phone = input.phone.trim();
  try {
    await api.POST('/api/v1/enquiries', {
      body: {
        name: input.name.trim(),
        email: input.email.trim(),
        message: input.message.trim(),
        ...(phone !== '' ? { phone } : {}),
        tourId: input.tourId,
      },
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      rateLimited: error instanceof ApiRequestError && error.status === 429,
    };
  }
}
