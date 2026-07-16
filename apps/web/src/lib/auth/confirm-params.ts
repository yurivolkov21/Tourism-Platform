import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Email-OTP types the `/auth/confirm` route accepts. Covers the app's three
 * email-link flows (`email_change`, `signup`, `recovery`) plus `invite` for
 * parity; magic-link / reauth aren't used. Anything else is rejected so an
 * attacker can't drive an unexpected verification type through the endpoint.
 */
const CONFIRM_TYPES = [
  'email_change',
  'signup',
  'recovery',
  'invite',
] as const satisfies readonly EmailOtpType[];

export interface ConfirmParams {
  tokenHash: string;
  type: EmailOtpType;
}

/**
 * Validate the `/auth/confirm` query. Returns `{ tokenHash, type }` only when a
 * non-empty `token_hash` is present and `type` is in the allow-list; otherwise
 * `null` (the route bounces to `/login?error=auth` without calling verifyOtp).
 * Pure — unit-tested without a live Supabase.
 */
export function parseConfirmParams(
  params: URLSearchParams,
): ConfirmParams | null {
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (!tokenHash) return null;
  // Widen to string[] for the membership test — `EmailOtpType` is broader than the
  // literal tuple, so `.includes` on the narrow tuple would reject it.
  if (!type || !(CONFIRM_TYPES as readonly string[]).includes(type))
    return null;
  return { tokenHash, type: type as EmailOtpType };
}
