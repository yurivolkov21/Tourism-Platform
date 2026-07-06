import { createApiClient, type ApiClient } from '@tourism/core';
import { API_BASE_URL } from './env';

let client: ApiClient | undefined;

/** App-wide typed API client (no auth token in W1 — getToken arrives with W3 auth). */
export function getApiClient(): ApiClient {
  client ??= createApiClient({ baseUrl: API_BASE_URL });
  return client;
}
