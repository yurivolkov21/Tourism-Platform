'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { components } from '@tourism/core';

import { apiErrorMessage } from '../api/error';
import { getApiClient } from '../api/client';
import { tourSchema, toTourPayload } from './schema';

export interface TourFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

type TourBody = components['schemas']['CreateTourDto'];

/** Empty string → undefined, so a blank optional field doesn't fail coercion. */
function opt(formData: FormData, key: string): string | undefined {
  const v = String(formData.get(key) ?? '').trim();
  return v === '' ? undefined : v;
}

/** Validates raw form fields against `tourSchema`. Array fields arrive as repeated inputs. */
function parseTourForm(formData: FormData) {
  return tourSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    categorySlug: String(formData.get('categorySlug') ?? ''),
    destinationSlugs: formData.getAll('destinationSlugs').map(String),
    primaryDestinationSlug: String(formData.get('primaryDestinationSlug') ?? ''),
    durationDays: opt(formData, 'durationDays'),
    maxGroupSize: opt(formData, 'maxGroupSize'),
    meetingPoint: String(formData.get('meetingPoint') ?? ''),
    basePrice: opt(formData, 'basePrice'),
    compareAtPrice: opt(formData, 'compareAtPrice'),
    currency: String(formData.get('currency') ?? ''),
    difficulty: String(formData.get('difficulty') ?? ''),
    isPublished: formData.get('isPublished') === 'true',
    isFeatured: formData.get('isFeatured') === 'true',
    suitableFor: formData.getAll('suitableFor').map(String),
    badges: formData.getAll('badges').map(String),
    highlights: formData.getAll('highlights').map(String),
    included: formData.getAll('included').map(String),
    excluded: formData.getAll('excluded').map(String),
  });
}

/** Flattens a Zod error into a `{ field: message }` map for inline display. */
function toFieldErrors(error: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Creates a tour (`POST /admin/tours`); maps 400 (bad ref) / 409 (slug) to friendly messages. */
export async function createTour(
  _prev: TourFormState,
  formData: FormData,
): Promise<TourFormState> {
  const parsed = parseTourForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    const api = await getApiClient();
    await api.POST('/api/v1/admin/tours', { body: toTourPayload(parsed.data) as TourBody });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/tours');
  redirect('/tours');
}

/** Updates a tour (`PATCH /admin/tours/:slug`); the slug is bound at call sites. */
export async function updateTour(
  slug: string,
  _prev: TourFormState,
  formData: FormData,
): Promise<TourFormState> {
  const parsed = parseTourForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    const api = await getApiClient();
    await api.PATCH('/api/v1/admin/tours/{slug}', {
      params: { path: { slug } },
      body: toTourPayload(parsed.data) as TourBody,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/tours');
  revalidatePath(`/tours/${slug}/edit`);
  redirect('/tours');
}

export interface DeleteTourState {
  error?: string;
}

/**
 * Deletes a tour (`DELETE /admin/tours/:slug`). The API returns 409 when it's still published or has
 * bookings; `apiErrorMessage` surfaces that reason (unpublish first / can't delete with bookings).
 */
export async function deleteTour(slug: string): Promise<DeleteTourState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/tours/{slug}', { params: { path: { slug } } });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/tours');
  return {};
}
