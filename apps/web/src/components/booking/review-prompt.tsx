'use client';

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { CheckIcon, StarIcon } from 'lucide-react';

import {
  Button,
  cn,
  Field,
  FieldLabel,
  Input,
  Textarea,
  toast,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import {
  validateReviewFields,
  type ReviewFieldErrors,
} from '../../lib/forms/validate';
import { submitReview } from '../../lib/reviews/actions';
import { FieldErrorText } from '../forms/field-error-text';

type Status = 'idle' | 'submitting' | 'success' | 'alreadyReviewed';

const STARS = [1, 2, 3, 4, 5] as const;

/** Shared success / already-reviewed panel (mirrors `EnquirySuccess`'s check-icon layout). */
function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="bg-success/15 text-success flex size-12 items-center justify-center rounded-full">
        <CheckIcon className="size-6" />
      </span>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-sm text-pretty text-sm">
        {body}
      </p>
    </div>
  );
}

/**
 * "Rate this trip" review form, offered on any PAID booking (see `page.tsx` for the PAID gate).
 * `hasReview` (API-W3) tells us upfront whether the caller already reviewed it, so the form never
 * even renders in that case; the 409 `alreadyReviewed` path stays as a race backstop (e.g. two tabs
 * submitting at once) for when `hasReview` was `false` at load but the review lands first here.
 * Submits via the `submitReview` server action: success and the 409 case both replace the form with
 * an inline status panel; other failures toast while the form stays editable.
 */
export function ReviewPrompt({
  bookingCode,
  hasReview = false,
}: {
  bookingCode: string;
  hasReview?: boolean;
}) {
  const t = messages.reviews;
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<Status>(
    hasReview ? 'alreadyReviewed' : 'idle',
  );
  const [fieldErrors, setFieldErrors] = useState<ReviewFieldErrors>({});

  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /** WAI-ARIA radiogroup keyboard contract: arrows move + select, focus follows. */
  function handleStarKeyDown(e: KeyboardEvent<HTMLButtonElement>, n: number) {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      next = n === 5 ? 1 : n + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = n === 1 ? 5 : n - 1;
    if (next === null) return;
    e.preventDefault();
    setRating(next);
    starRefs.current[next - 1]?.focus();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;
    const invalid = validateReviewFields({ rating, title, body });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length > 0) return;

    setStatus('submitting');
    // The action invocation itself can reject (offline, deploy skew) — without
    // this catch the form would be stuck disabled in `submitting` forever.
    let res: Awaited<ReturnType<typeof submitReview>>;
    try {
      res = await submitReview({ bookingCode, rating, title, body });
    } catch {
      setStatus('idle');
      toast.error(t.errors.generic);
      return;
    }
    if (res.ok) {
      setStatus('success');
      return;
    }
    if (res.alreadyReviewed) {
      setStatus('alreadyReviewed');
      return;
    }
    setStatus('idle');
    if (res.fieldErrors) {
      setFieldErrors(res.fieldErrors);
      return;
    }
    toast.error(res.error ?? t.errors.generic);
  }

  if (status === 'success') {
    return <StatusPanel title={t.successTitle} body={t.successBody} />;
  }
  if (status === 'alreadyReviewed') {
    return (
      <StatusPanel
        title={t.alreadyReviewedTitle}
        body={t.alreadyReviewedBody}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{t.heading}</h3>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field className="gap-1.5">
          <FieldLabel id="review-rating-label">{t.ratingLabel}</FieldLabel>
          <div
            role="radiogroup"
            aria-labelledby="review-rating-label"
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.rating)}
            aria-describedby={
              fieldErrors.rating ? 'review-rating-error' : undefined
            }
            className="flex items-center gap-1"
          >
            {STARS.map((n) => (
              <button
                key={n}
                ref={(el) => {
                  starRefs.current[n - 1] = el;
                }}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={t.ratingValueLabel(n)}
                tabIndex={n === (rating || 1) ? 0 : -1}
                onClick={() => setRating(n)}
                onKeyDown={(e) => handleStarKeyDown(e, n)}
                className="focus-visible:ring-ring rounded-sm p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <StarIcon
                  className={cn(
                    'size-6',
                    n <= rating
                      ? 'fill-rating text-rating'
                      : 'text-muted-foreground/40',
                  )}
                />
              </button>
            ))}
          </div>
          <FieldErrorText
            id="review-rating-error"
            field="rating"
            code={fieldErrors.rating}
          />
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="review-title">{t.titleLabel}</FieldLabel>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={
              fieldErrors.title ? 'review-title-error' : undefined
            }
          />
          <FieldErrorText
            id="review-title-error"
            field="title"
            code={fieldErrors.title}
          />
        </Field>

        <Field className="gap-1.5">
          <FieldLabel htmlFor="review-body">{t.bodyLabel}</FieldLabel>
          <Textarea
            id="review-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.bodyPlaceholder}
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.body)}
            aria-describedby={
              fieldErrors.body ? 'review-body-error' : undefined
            }
          />
          <FieldErrorText
            id="review-body-error"
            field="body"
            code={fieldErrors.body}
          />
        </Field>

        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? t.submitting : t.submit}
        </Button>
      </form>
    </div>
  );
}

export default ReviewPrompt;
