import { createApiClient, type ApiClient } from '@tourism/core';

import { createClient } from '../supabase/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * A typed `@tourism/core` API client whose Bearer token is read, per request, from the current
 * server-side Supabase session. Use inside Server Components / Server Actions only.
 */
export async function getApiClient(): Promise<ApiClient> {
  const supabase = await createClient();
  return createApiClient({
    baseUrl: API_BASE,
    getToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}
