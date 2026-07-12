// Public reviews reads for the marketing site, plus the authed "rate this trip" write. The typed
// OpenAPI client doesn't carry the freshly added `/reviews/featured` route yet, so the read below
// uses a plain fetch against the same API origin; the write goes through `authedJson` (owner-scoped).

import type { components } from '@tourism/core';

import { authedJson } from './authed';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type CreateReviewDto = components['schemas']['CreateReviewDto'];
export type ReviewDto = components['schemas']['ReviewDto'];

export interface FeaturedReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorLocation: string | null;
  tripLabel: string | null;
  createdAt: string;
}

/** Featured testimonials for the homepage carousel (`GET /reviews/featured`). `[]` on error. */
export async function fetchFeaturedReviews(): Promise<FeaturedReview[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/reviews/featured`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: FeaturedReview[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

/**
 * Create a review on a PAID booking (`POST /reviews`, owner-scoped). Throws `ApiRequestError` on
 * failure — the caller (`submitReview`) maps codes like 409 `REVIEW_ALREADY_EXISTS` to friendly UX.
 */
export async function createReview(
  payload: CreateReviewDto,
): Promise<ReviewDto> {
  return authedJson<ReviewDto>('/api/v1/reviews', {
    method: 'POST',
    body: payload,
  });
}
