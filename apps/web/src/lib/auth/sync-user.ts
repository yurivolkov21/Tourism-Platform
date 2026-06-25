import { createApiClient } from '@tourism/core';

import { createClient } from '../supabase/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Mirror the signed-in Supabase user into the API's local DB via `POST /auth/sync` (idempotent
 * CUSTOMER upsert; the API reads identity from the Bearer JWT). Best-effort: the session is already
 * established by Supabase, so a transient API hiccup here must not block sign-in — it re-syncs on the
 * next sign-in. Returns `true` on success. Server-only (uses the cookie-bound server client).
 */
export async function syncUser(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const api = createApiClient({
      baseUrl: API_BASE,
      getToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
    });
    await api.POST('/api/v1/auth/sync', { body: {} });
    return true;
  } catch {
    return false;
  }
}
