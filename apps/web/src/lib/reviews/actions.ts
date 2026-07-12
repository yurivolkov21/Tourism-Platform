'use server';

import { ApiRequestError } from '@tourism/core';
import { messages } from '@tourism/i18n';

import { createReview } from '../api/reviews';
import {
  validateReviewFields,
  type ReviewFieldErrors,
} from '../forms/validate';

const errors = messages.reviews.errors;

export interface SubmitReviewInput {
  bookingCode: string;
  rating: number;
  title: string;
  body: string;
}

export interface SubmitReviewResult {
  ok: boolean;
  fieldErrors?: ReviewFieldErrors;
  /** 409 REVIEW_ALREADY_EXISTS — render the "already reviewed" panel instead of an error toast. */
  alreadyReviewed?: true;
  error?: string;
}

/** Maps an API error code to friendly EN; unknown codes fall back to the generic message. */
function errorMessage(code: string): string {
  return (errors as Record<string, string>)[code] ?? errors.generic;
}

/**
 * Server action behind `ReviewPrompt`: re-validate the same fields the client already checked
 * (client validation is UX only), then `POST /reviews`. The 409 `REVIEW_ALREADY_EXISTS` case is
 * mapped to `alreadyReviewed: true` so the form can show a calm "already reviewed" panel instead
 * of an error toast.
 */
export async function submitReview(
  input: SubmitReviewInput,
): Promise<SubmitReviewResult> {
  // Coerce once — server actions are public endpoints, crafted payloads can
  // carry non-strings (the validator is total on them; keep the payload build
  // total too).
  const title = typeof input.title === 'string' ? input.title : '';
  const body = typeof input.body === 'string' ? input.body : '';
  const fieldErrors = validateReviewFields({
    rating: input.rating,
    title,
    body,
  });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  try {
    await createReview({
      bookingCode: input.bookingCode,
      rating: input.rating,
      title: title.trim() || undefined,
      body: body.trim(),
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.code === 'REVIEW_ALREADY_EXISTS') {
        return { ok: false, alreadyReviewed: true };
      }
      console.error('[reviews] submit failed', {
        bookingCode: input.bookingCode,
        code: e.code,
        status: e.status,
      });
      return { ok: false, error: errorMessage(e.code) };
    }
    console.error('[reviews] submit unexpected error', e);
    return { ok: false, error: errors.generic };
  }
}
