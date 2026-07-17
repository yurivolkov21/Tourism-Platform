'use client';

import { useEffect, useRef, useState } from 'react';
import { StarIcon } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { isClamped } from '../../lib/reviews-pager';
import type { TourReview } from '../../lib/tours';

/** 5-star row shared by the inline card, the read-more dialog, and the see-all list. */
export function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          aria-hidden="true"
          className={cn(
            'size-4',
            i < rating ? 'fill-rating text-rating' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

/** Author + date + verified footer line (same in the card and both dialogs). */
export function ReviewByline({ review }: { review: TourReview }) {
  const t = messages.tourDetail.reviewsSection;
  return (
    <div>
      <div className="font-semibold">{review.author}</div>
      <div className="text-muted-foreground text-xs">
        {review.date} · {t.verified}
      </div>
    </div>
  );
}

/**
 * One inline review card. The quote is clamped to five lines so every card in a
 * grid row stays the same height; "Read more" renders ONLY when the content
 * actually overflows the clamp (measured — `scrollHeight > clientHeight`,
 * re-measured on resize) and opens the full review in a dialog.
 */
export function ReviewCard({ review }: { review: TourReview }) {
  const t = messages.tourDetail.reviewsSection;
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = quoteRef.current;
    if (!el) return;
    const measure = () =>
      setTruncated(isClamped(el.scrollHeight, el.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [review.quote]);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-6">
        <ReviewStars rating={review.rating} />
        <p ref={quoteRef} className="line-clamp-5 text-pretty">
          “{review.quote}”
        </p>
        {truncated ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-primary h-auto self-start p-0"
          >
            {t.readMore}
          </Button>
        ) : null}
        <div className="mt-auto pt-2">
          <ReviewByline review={review} />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <ReviewStars rating={review.rating} />
              <p className="max-h-[60vh] overflow-y-auto text-pretty">
                “{review.quote}”
              </p>
              <ReviewByline review={review} />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default ReviewCard;
