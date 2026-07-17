import type { components } from '@tourism/core';

import type { TourReview } from '../tours';

type PublicReviewDto = components['schemas']['PublicReviewDto'];

/**
 * DTO → view-model mapping for public reviews. Lives outside `tour-detail.ts`
 * (which imports React `cache`, a server-only seam) so the see-all dialog — a
 * client component paging the API from the browser — can reuse the exact same
 * PII-stripped shape.
 */

/** "May 2024" from an ISO timestamp (graceful on a bad/empty value). */
export function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function toTourReview(dto: PublicReviewDto): TourReview {
  return {
    id: dto.id,
    author: dto.reviewer.fullName,
    date: formatReviewDate(dto.createdAt),
    rating: dto.rating,
    quote: dto.body,
  };
}
