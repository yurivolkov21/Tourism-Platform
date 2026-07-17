import { StarIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { MAX_INLINE_REVIEWS, shouldShowSeeAll } from '../../lib/reviews-pager';
import type { TourReview } from '../../lib/tours';
import { ReviewCard } from './review-card';
import { SeeAllReviews } from './see-all-reviews';

/**
 * Traveller reviews — server shell (heading + rating badge + 3-up grid). At most
 * {@link MAX_INLINE_REVIEWS} clamped cards render inline so the layout is stable
 * regardless of review length/count; the interactive pieces (per-card Read-more
 * dialog, See-all pagination dialog) are client components.
 */
export function TourReviews({
  slug,
  reviews,
  rating,
  reviewCount,
}: {
  slug: string;
  reviews: TourReview[];
  rating: number;
  reviewCount: number;
}) {
  if (reviews.length === 0) return null;
  const t = messages.tourDetail.reviewsSection;
  const inline = reviews.slice(0, MAX_INLINE_REVIEWS);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="bg-primary h-6 w-1.5 shrink-0 rounded-full"
            aria-hidden
          />
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
            {t.heading}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <StarIcon
              className="fill-rating text-rating size-4"
              aria-hidden="true"
            />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount})</span>
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {inline.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {shouldShowSeeAll(reviewCount, MAX_INLINE_REVIEWS) ? (
          <SeeAllReviews
            slug={slug}
            reviewCount={reviewCount}
            initial={inline}
          />
        ) : null}
      </div>
    </section>
  );
}

export default TourReviews;
