import { type components } from '@tourism/core';
import { getApiClient } from './api';

export type ReviewDto = components['schemas']['ReviewDto'];

const MAX_TITLE = 120;
const MIN_BODY = 10;
const MAX_BODY = 2000;

export interface ReviewFieldErrors {
  rating?: 'RATING_REQUIRED';
  title?: 'TITLE_TOO_LONG';
  body?: 'BODY_REQUIRED' | 'BODY_TOO_SHORT' | 'BODY_TOO_LONG';
}

/** Mirrors `apps/web/src/lib/forms/validate.ts`'s `validateReviewFields` rule-for-rule
 * (same limits, same error codes) so `messages.fieldErrors` stays the single copy source. */
export function validateReviewFields(fields: {
  rating: number;
  title: string;
  body: string;
}): ReviewFieldErrors {
  const errors: ReviewFieldErrors = {};
  if (
    !Number.isInteger(fields.rating) ||
    fields.rating < 1 ||
    fields.rating > 5
  ) {
    errors.rating = 'RATING_REQUIRED';
  }
  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  if (title.length > MAX_TITLE) errors.title = 'TITLE_TOO_LONG';
  const body = typeof fields.body === 'string' ? fields.body.trim() : '';
  if (!body) errors.body = 'BODY_REQUIRED';
  else if (body.length < MIN_BODY) errors.body = 'BODY_TOO_SHORT';
  else if (body.length > MAX_BODY) errors.body = 'BODY_TOO_LONG';
  return errors;
}

export interface CreateReviewInput {
  bookingCode: string;
  rating: number;
  title: string;
  body: string;
}

/** `POST /api/v1/reviews` for a PAID booking — created pending moderation. */
export async function createReview(
  input: CreateReviewInput,
): Promise<ReviewDto> {
  const title = input.title.trim();
  const { data } = await getApiClient().POST('/api/v1/reviews', {
    body: {
      bookingCode: input.bookingCode,
      rating: input.rating,
      title: title || undefined,
      body: input.body.trim(),
    },
  });
  const dto = (data as unknown as { data?: ReviewDto } | undefined)?.data;
  if (!dto) throw new Error('empty review response');
  return dto;
}
