import { createApiClient, type ApiClient } from '@tourism/core';

// API origin (NOT including `/api/v1` — the typed client's routes already carry the prefix).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Public `@tourism/core` API client for the customer web (read-only catalog — no auth token).
 * Used in Server Components / `generateStaticParams`; pages set `revalidate` so reads are cached
 * (ISR) rather than hitting the API per request (the free API tier sleeps).
 */
export function getApiClient(): ApiClient {
  return createApiClient({ baseUrl: API_BASE });
}
