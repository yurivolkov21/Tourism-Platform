import { StarIcon } from 'lucide-react';

import { Card, CardContent, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { TourReview } from '../../lib/tours';

/** Traveller reviews — a 3-up grid of quote cards with star ratings (Lily-style social proof). */
export function TourReviews({
  reviews,
  rating,
  reviewCount,
}: {
  reviews: TourReview[];
  rating: number;
  reviewCount: number;
}) {
  if (reviews.length === 0) return null;
  const t = messages.tourDetail.reviewsSection;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="bg-primary h-6 w-1.5 shrink-0 rounded-full" aria-hidden />
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">{t.heading}</h2>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <StarIcon className="fill-rating text-rating size-4" />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount})</span>
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <Card key={review.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <div className="flex gap-0.5" aria-label={`${review.rating} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon
                      key={i}
                      className={cn('size-4', i < review.rating ? 'fill-rating text-rating' : 'text-muted-foreground/30')}
                    />
                  ))}
                </div>
                <p className="text-pretty">“{review.quote}”</p>
                <div className="mt-auto pt-2">
                  <div className="font-semibold">{review.author}</div>
                  <div className="text-muted-foreground text-xs">
                    {review.date} · {t.verified}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TourReviews;
