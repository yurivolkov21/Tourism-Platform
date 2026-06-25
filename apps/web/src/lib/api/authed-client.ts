import { createApiClient, type ApiClient } from '@tourism/core';

import { createClient } from '../supabase/server';

// API origin (NOT including `/api/v1` — the typed client's routes already carry the prefix).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * A typed `@tourism/core` API client whose Bearer token is read, per request, from the current
 * server-side Supabase session. Mirrors the admin app's authed client. Use inside Server Components /
 * Server Actions only — booking create/checkout/capture/read all go through this so the caller's JWT
 * reaches the owner-scoped `/bookings` routes.
 */
export async function getAuthedApiClient(): Promise<ApiClient> {
  const supabase = await createClient();
  return createApiClient({
    baseUrl: API_BASE,
    getToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}
