import { getApiClient } from './client';

export type SubscribeResult =
  | { ok: true }
  | { ok: false; rateLimited: boolean };

/**
 * Subscribe an email to the newsletter via the public
 * `POST /api/v1/newsletter/subscribe` — from the browser on purpose (same
 * reasoning as `submitEnquiry`: the API throttles per-IP, so each visitor gets
 * their own 5/min budget). Never throws; a 429 maps to `rateLimited`.
 */
export async function subscribeNewsletter(
  email: string,
  website?: string,
): Promise<SubscribeResult> {
  try {
    const api = getApiClient();
    const { error, response } = await api.POST('/api/v1/newsletter/subscribe', {
      body: { email: email.trim(), source: 'footer', website },
    });
    if (error || !response.ok) {
      return { ok: false, rateLimited: response?.status === 429 };
    }
    return { ok: true };
  } catch {
    return { ok: false, rateLimited: false };
  }
}
