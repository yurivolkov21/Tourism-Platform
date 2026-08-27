/**
 * Parsing for the password-recovery deep link Supabase sends to the app.
 *
 * Supabase can hand the recovery back in three different shapes, and which one
 * arrives depends on the project's email template and flow type — so all three
 * are read rather than assumed:
 *
 * - **fragment tokens** (`#access_token=…&refresh_token=…`) — the implicit
 *   flow, this client's default. Neither `Linking.parse` nor `URL.searchParams`
 *   ever sees a fragment (they only read the query string), which is the same
 *   trap `google-auth.ts` documents.
 * - **`?token_hash=…&type=recovery`** — the template style that verifies
 *   server-side, so the link works from any mail client.
 * - **`?code=…`** — the PKCE exchange.
 *
 * Kept pure and separate so the parsing is unit-testable without a device.
 */

export type RecoveryLink =
  /** Session handed over directly — adopt it with `setSession`. */
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  /** Verify server-side with `verifyOtp`. */
  | { kind: 'tokenHash'; tokenHash: string; type: string }
  /** Exchange with `exchangeCodeForSession`. */
  | { kind: 'code'; code: string }
  /** Supabase reports a failed/expired link in the URL, not as an HTTP error. */
  | { kind: 'error'; code: string }
  /** The URL carries no recovery outcome at all. */
  | null;

/** Query and fragment merged — Supabase uses whichever half suits the flow. */
function allParams(url: string): URLSearchParams {
  const merged = new URLSearchParams();
  const [beforeHash, fragment] = url.split('#');
  const query = beforeHash.split('?')[1];
  for (const part of [query, fragment]) {
    if (!part) continue;
    for (const [key, value] of new URLSearchParams(part))
      merged.set(key, value);
  }
  return merged;
}

export function parseRecoveryLink(
  url: string | null | undefined,
): RecoveryLink {
  if (!url) return null;
  const params = allParams(url);

  // Errors win: an expired link can also carry a stale token to ignore.
  const errorCode = params.get('error_code') ?? params.get('error');
  if (errorCode) return { kind: 'error', code: errorCode };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken)
    return { kind: 'tokens', accessToken, refreshToken };

  const tokenHash = params.get('token_hash');
  if (tokenHash)
    return {
      kind: 'tokenHash',
      tokenHash,
      type: params.get('type') || 'recovery',
    };

  const code = params.get('code');
  if (code) return { kind: 'code', code };

  return null;
}

/**
 * The parameter NAMES a link carried, for a dev-only diagnostic line. Names
 * only — the values are credentials and must never be rendered or logged.
 */
export function describeRecoveryLink(url: string | null | undefined): string {
  if (!url) return 'no url';
  const keys = [...allParams(url).keys()];
  const path = url.split('?')[0].split('#')[0];
  return keys.length ? `${path} [${keys.join(', ')}]` : `${path} [no params]`;
}
