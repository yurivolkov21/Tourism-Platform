import { createApiClient, type ApiClient } from '@tourism/core';
import { API_BASE_URL } from './env';
import { supabase } from './supabase';

let client: ApiClient | undefined;

/** App-wide typed API client. Guests get no Authorization header (token undefined). */
export function getApiClient(): ApiClient {
  client ??= createApiClient({
    baseUrl: API_BASE_URL,
    getToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
  });
  return client;
}
