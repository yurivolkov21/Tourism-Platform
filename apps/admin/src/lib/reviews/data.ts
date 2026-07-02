import type { components } from '@tourism/core';
import { ApiRequestError } from '@tourism/core';

import { createClient } from '../supabase/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** Admin review row — the generated `AdminReviewDto` (incl. `tripLabel`/`tourTitle`). */
export type AdminReview = components['schemas']['AdminReviewDto'];

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminReviewList {
  data: AdminReview[];
  meta: PageMeta;
}

export interface AdminReviewParams {
  page?: number;
  pageSize?: number;
  isApproved?: boolean;
}

// Plain authed GET — generated types are the source of the row shape.
// (Reads are clone-safe, so no undici body gotcha; that only affects writes.)
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

/** Lists reviews for the moderation table (`GET /admin/reviews`, optional `isApproved` filter). */
export async function listAdminReviews(params: AdminReviewParams = {}): Promise<AdminReviewList> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  q.set('pageSize', String(params.pageSize ?? 20));
  if (params.isApproved !== undefined) q.set('isApproved', String(params.isApproved));
  return authedGet<AdminReviewList>(`/api/v1/admin/reviews?${q.toString()}`);
}
