'use client';

import { useEffect, useRef, useState } from 'react';

import type { components } from '@tourism/core';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { getApiClient } from '../../lib/api/client';
import { toTourReview } from '../../lib/api/review-mapper';
import {
  REVIEWS_PAGE_SIZE,
  appendReviewPage,
  hasMoreReviews,
} from '../../lib/reviews-pager';
import type { TourReview } from '../../lib/tours';
import { ReviewByline, ReviewStars } from './review-card';

type PublicReviewDto = components['schemas']['PublicReviewDto'];

/**
 * "See all {N} reviews" — a dialog that pages through EVERY approved review via
 * the public `GET /tours/:slug/reviews` endpoint, browser-side (same pattern as
 * the chat panel; CORS covers the web origin). The list seeds from the inline
 * reviews so it opens instantly; page fetches merge in via `appendReviewPage`
 * (id-deduped). A failed page keeps what's loaded and leaves "Load more" as the
 * retry. Quotes are NOT clamped here — this is the read-everything surface.
 */
export function SeeAllReviews({
  slug,
  reviewCount,
  initial,
}: {
  slug: string;
  reviewCount: number;
  initial: TourReview[];
}) {
  const t = messages.tourDetail.reviewsSection;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TourReview[]>(initial);
  const [fetchedPages, setFetchedPages] = useState(0);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function fetchPage(pageNum: number) {
    setLoading(true);
    setError(false);
    try {
      const { data } = await getApiClient().GET(
        '/api/v1/tours/{slug}/reviews',
        {
          params: {
            path: { slug },
            query: { page: pageNum, pageSize: REVIEWS_PAGE_SIZE },
          },
        },
      );
      const body = data as unknown as {
        data?: PublicReviewDto[];
        meta?: { totalPages?: number };
      };
      setItems((prev) =>
        appendReviewPage(prev, (body.data ?? []).map(toTourReview)),
      );
      setTotalPages(body.meta?.totalPages ?? pageNum);
      setFetchedPages(pageNum);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // First open → load page 1 (replaces the seed's page-1 overlap via dedupe).
  // The ref is set synchronously BEFORE the request, so the auto-fetch fires at
  // most once per mount even under StrictMode double-effects — and, crucially,
  // a FAILED page 1 does not auto-retry (fetchedPages/loading state changes
  // must not re-trigger this); "Load more" is the manual retry path.
  const requestedRef = useRef(false);
  useEffect(() => {
    if (open && !requestedRef.current) {
      requestedRef.current = true;
      void fetchPage(1);
    }
  }, [open]);

  const showLoadMore =
    totalPages !== null && hasMoreReviews(fetchedPages, totalPages);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="mt-8"
      >
        {t.seeAll(reviewCount)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.listDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            {items.map((review) => (
              <div key={review.id} className="space-y-2">
                <ReviewStars rating={review.rating} />
                <p className="text-pretty">“{review.quote}”</p>
                <ReviewByline review={review} />
              </div>
            ))}
            {loading ? (
              <p className="text-muted-foreground text-sm">{t.loading}</p>
            ) : null}
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {t.loadError}
              </p>
            ) : null}
            {!loading && (showLoadMore || error) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchPage(fetchedPages + 1)}
              >
                {t.loadMore}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SeeAllReviews;
