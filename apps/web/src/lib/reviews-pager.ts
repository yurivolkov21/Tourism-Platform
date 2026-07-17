import type { TourReview } from './tours';

/**
 * Layout + paging rules for the tour-detail "Traveller reviews" section
 * (spec: docs/06-specs/2026-07-17-tour-reviews-clamp-modal-design.md).
 * Pure — the client components (ReviewCard / SeeAllReviews) call these so the
 * decisions stay unit-testable without a DOM or a network.
 */

/** How many review cards render inline in the 3-up grid. */
export const MAX_INLINE_REVIEWS = 6;

/** Page size the see-all dialog requests from `GET /tours/:slug/reviews`. */
export const REVIEWS_PAGE_SIZE = 9;

/** "See all {N} reviews" appears only when there is more than the inline cap. */
export function shouldShowSeeAll(
  reviewCount: number,
  inlineCount: number,
): boolean {
  return Number.isFinite(reviewCount) && reviewCount > inlineCount;
}

/**
 * Merge a fetched page into the already-loaded list, de-duped by id — a
 * moderation-shifted page boundary (or the seed overlap) must not render the
 * same review twice.
 */
export function appendReviewPage(
  existing: TourReview[],
  next: TourReview[],
): TourReview[] {
  const seen = new Set(existing.map((r) => r.id));
  return [...existing, ...next.filter((r) => !seen.has(r.id))];
}

/** More pages remain while the current page is below the API's totalPages. */
export function hasMoreReviews(page: number, totalPages: number): boolean {
  return Number.isFinite(totalPages) && page < totalPages;
}

/** The quote is actually truncated when its content overflows the clamp box. */
export function isClamped(scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight > clientHeight;
}
