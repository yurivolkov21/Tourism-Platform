'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { flashPath } from '../flash';

export interface ReviewActionState {
  error?: string;
}

/** Approve / re-draft a review (`PATCH /admin/reviews/:id/moderation`). */
export async function setApproved(
  id: string,
  isApproved: boolean,
): Promise<ReviewActionState> {
  try {
    await apiWrite(
      'PATCH',
      `/api/v1/admin/reviews/${encodeURIComponent(id)}/moderation`,
      {
        isApproved,
      },
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/reviews');
  return {};
}

/** Pin / unpin a review on the homepage (`PATCH /admin/reviews/:id/feature`). */
export async function setFeatured(
  id: string,
  isFeatured: boolean,
): Promise<ReviewActionState> {
  try {
    await apiWrite(
      'PATCH',
      `/api/v1/admin/reviews/${encodeURIComponent(id)}/feature`,
      {
        isFeatured,
      },
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/reviews');
  return {};
}

export interface CuratedFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Create a curated testimonial (`POST /admin/reviews/curated`). Approved + featured by the API. */
export async function createCurated(
  _prev: CuratedFormState,
  formData: FormData,
): Promise<CuratedFormState> {
  const authorName = String(formData.get('authorName') ?? '').trim();
  const authorLocation = String(formData.get('authorLocation') ?? '').trim();
  const tripLabel = String(formData.get('tripLabel') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const rating = Number.parseInt(String(formData.get('rating') ?? '5'), 10);

  const fieldErrors: Record<string, string> = {};
  if (authorName.length < 2)
    fieldErrors.authorName = 'Enter the traveller’s name.';
  if (body.length < 10)
    fieldErrors.body = 'The testimonial must be at least 10 characters.';
  if (!(rating >= 1 && rating <= 5)) fieldErrors.rating = 'Rating must be 1–5.';
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await apiWrite('POST', '/api/v1/admin/reviews/curated', {
      authorName,
      authorLocation: authorLocation || undefined,
      tripLabel: tripLabel || undefined,
      rating,
      body,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/reviews');
  redirect(flashPath('/reviews', 'created'));
}

/** Edit a curated testimonial (`PATCH /admin/reviews/:id`); verified reviews 409 server-side (the
 * API guards it, `apiErrorMessage` maps `REVIEW_NOT_CURATED` to a friendly message). */
export async function updateCurated(
  id: string,
  _prev: CuratedFormState,
  formData: FormData,
): Promise<CuratedFormState> {
  const authorName = String(formData.get('authorName') ?? '').trim();
  const authorLocation = String(formData.get('authorLocation') ?? '').trim();
  const tripLabel = String(formData.get('tripLabel') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const rating = Number.parseInt(String(formData.get('rating') ?? '5'), 10);

  const fieldErrors: Record<string, string> = {};
  if (authorName.length < 2)
    fieldErrors.authorName = 'Enter the traveller’s name.';
  if (body.length < 10)
    fieldErrors.body = 'The testimonial must be at least 10 characters.';
  if (!(rating >= 1 && rating <= 5)) fieldErrors.rating = 'Rating must be 1–5.';
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    // Blanked optional fields must CLEAR the stored value — send null (the API
    // treats null as "clear"); `undefined` would be dropped from the JSON body
    // and silently keep the stale value (adversarial-review finding).
    await apiWrite('PATCH', `/api/v1/admin/reviews/${encodeURIComponent(id)}`, {
      authorName,
      authorLocation: authorLocation || null,
      tripLabel: tripLabel || null,
      rating,
      body,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/reviews');
  redirect(flashPath('/reviews', 'updated'));
}

/** Delete a curated testimonial (`DELETE /admin/reviews/:id`); verified reviews 409 server-side. */
export async function deleteReview(id: string): Promise<ReviewActionState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/reviews/{id}', {
      params: { path: { id } },
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/reviews');
  return {};
}
