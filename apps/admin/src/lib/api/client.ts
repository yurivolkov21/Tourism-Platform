import { ApiRequestError, createApiClient, type ApiClient } from '@tourism/core';

import { createClient } from '../supabase/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/**
 * A typed `@tourism/core` API client whose Bearer token is read, per request, from the current
 * server-side Supabase session. Use inside Server Components / Server Actions only.
 *
 * READS ONLY (bodyless GET). For body-carrying writes use {@link apiWrite} — on Vercel, the typed
 * client's streamed request body trips undici's "expected non-null body source" behind Vercel's
 * outgoing-fetch tracing (works locally, fails on deploy).
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

/**
 * Authed write (POST/PATCH/PUT) via native `fetch` with a **string** body — clone-safe on Vercel
 * (see {@link getApiClient}). Reads the Bearer token per call from the server Supabase session,
 * unwraps the `{ data, error }` envelope, and throws `ApiRequestError` on non-2xx so `apiErrorMessage`
 * maps it. Pass an already-interpolated `path` (e.g. `/api/v1/admin/tours/my-slug`).
 */
export async function apiWrite<T = unknown>(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  body: unknown = {},
  /** Explicit Bearer token. Pass it right after sign-in (the just-set session cookie may not be
   * readable yet within the same request); omitted, it's read from the server Supabase session. */
  token?: string,
): Promise<T> {
  let bearer = token;
  if (!bearer) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    bearer = data.session?.access_token ?? undefined;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;
  if (!res.ok) {
    throw new ApiRequestError(res.status, json?.error ?? { code: 'UNKNOWN', message: res.statusText });
  }
  return json?.data as T;
}
