import { ApiRequestError } from '@tourism/core';

import { createClient } from '../supabase/server';

// API origin (routes below already carry the `/api/v1` prefix).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Authed JSON call to the API using native `fetch` with a **string** body. We deliberately bypass the
 * openapi-fetch client for owner-scoped writes: on Vercel, outgoing-fetch tracing clones the request,
 * and a streamed body (openapi-fetch's Request path) trips undici's "expected non-null body source" —
 * a string body is clone-safe. Reads the Bearer token per call from the server Supabase session,
 * unwraps the `{ data, error }` envelope, and throws `ApiRequestError` on non-2xx.
 */
export async function authedJson<T>(
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      json?.error ?? { code: 'UNKNOWN', message: res.statusText },
    );
  }
  return json?.data as T;
}
