import type { components } from '@tourism/core';
import { ApiRequestError } from '@tourism/core';

import { createClient } from '../supabase/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** Admin slot row — the generated `AdminSiteMediaSlotDto` (catalog entry + current media). */
export type AdminSiteSlot = components['schemas']['AdminSiteMediaSlotDto'];

// Plain authed GET, mirroring the other admin data readers (reads are clone-safe).
async function authedGet<T>(path: string): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string } })
    | null;
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      json?.error ?? { code: 'UNKNOWN', message: res.statusText },
    );
  }
  return json as T;
}

/** Full brand-chrome slot catalog with current media (`GET /admin/site-media`). */
export async function listSiteSlots(): Promise<AdminSiteSlot[]> {
  const json = await authedGet<{ data: AdminSiteSlot[] }>(
    '/api/v1/admin/site-media',
  );
  return json.data ?? [];
}
