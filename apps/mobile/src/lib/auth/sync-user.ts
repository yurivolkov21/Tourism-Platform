import type { Session } from '@supabase/supabase-js';

import { getApiClient } from '../api/client';

/**
 * Mirror the signed-in Supabase user into the API's local DB via `POST /auth/sync` (idempotent
 * CUSTOMER upsert; the API reads identity from the Bearer JWT). Best-effort: the session is already
 * established by Supabase, so a transient API hiccup here must not block sign-in — it re-syncs on the
 * next sign-in (and owner-scoped calls self-heal on `USER_NOT_SYNCED`).
 */
export async function syncUser(session: Session | null): Promise<boolean> {
  const token = session?.access_token;
  if (!token) {
    return false;
  }

  try {
    const metaName = session.user?.user_metadata?.full_name;
    const body = typeof metaName === 'string' && metaName.trim() ? { fullName: metaName.trim() } : {};

    const client = getApiClient();
    await client.POST('/api/v1/auth/sync', { body });
    return true;
  } catch (e) {
    console.error('[syncUser] threw', e);
    return false;
  }
}
