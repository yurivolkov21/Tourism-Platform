'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { components } from '@tourism/core';

import { apiErrorMessage } from '../api/error';
import { getApiClient } from '../api/client';
import { destinationSchema, toDestinationPayload } from './schema';

export interface DestinationFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

type DestinationBody = components['schemas']['CreateDestinationDto'];

/** Validates raw form fields against `destinationSchema`; returns the parsed input or field errors. */
function parseDestinationForm(formData: FormData) {
  return destinationSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    country: String(formData.get('country') ?? ''),
    region: String(formData.get('region') ?? ''),
    description: String(formData.get('description') ?? ''),
    isActive: formData.get('isActive') === 'true',
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

/** Creates a destination (`POST /admin/destinations`); maps a 409 to a friendly slug-conflict message. */
export async function createDestination(
  _prev: DestinationFormState,
  formData: FormData,
): Promise<DestinationFormState> {
  const parsed = parseDestinationForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    const api = await getApiClient();
    await api.POST('/api/v1/admin/destinations', {
      body: toDestinationPayload(parsed.data) as DestinationBody,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/destinations');
  redirect('/destinations');
}

/** Updates a destination (`PATCH /admin/destinations/:slug`); the slug is bound at call sites. */
export async function updateDestination(
  slug: string,
  _prev: DestinationFormState,
  formData: FormData,
): Promise<DestinationFormState> {
  const parsed = parseDestinationForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    const api = await getApiClient();
    await api.PATCH('/api/v1/admin/destinations/{slug}', {
      params: { path: { slug } },
      body: toDestinationPayload(parsed.data) as DestinationBody,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/destinations');
  revalidatePath(`/destinations/${slug}/edit`);
  redirect('/destinations');
}
