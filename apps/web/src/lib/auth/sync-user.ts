import { createClient } from '../supabase/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Mirror the signed-in Supabase user into the API's local DB via `POST /auth/sync` (idempotent
 * CUSTOMER upsert; the API reads identity from the Bearer JWT). Best-effort: the session is already
 * established by Supabase, so a transient API hiccup here must not block sign-in — it re-syncs on the
 * next sign-in (and the booking action self-heals on `USER_NOT_SYNCED`). Returns `true` on success.
 *
 * Uses native `fetch` with a **string** body on purpose: on Vercel, outgoing-fetch tracing clones the
 * request, and a streamed body (the openapi-fetch path) trips undici's "expected non-null body source",
 * which previously made every sign-in sync fail silently. Server-only (uses the cookie-bound client).
 */
export async function syncUser(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const token = session?.access_token;
    if (!token) {
      console.error('[syncUser] no access token in server session');
      return false;
    }

    // Forward the sign-up display name (Supabase user metadata) so the API profile is pre-filled.
    const metaName = session.user?.user_metadata?.full_name;
    const body =
      typeof metaName === 'string' && metaName.trim()
        ? { fullName: metaName.trim() }
        : {};

    const res = await fetch(`${API_BASE}/api/v1/auth/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[syncUser] /auth/sync non-ok', {
        status: res.status,
        body: body.slice(0, 300),
      });
      return false;
    }
    return true;
  } catch (e) {
    console.error('[syncUser] threw', e);
    return false;
  }
}
