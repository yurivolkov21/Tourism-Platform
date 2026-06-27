'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { destinationSchema, toDestinationPayload } from './schema';

export interface DestinationFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

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
    await apiWrite('POST', '/api/v1/admin/destinations', toDestinationPayload(parsed.data));
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
    await apiWrite(
      'PATCH',
      `/api/v1/admin/destinations/${encodeURIComponent(slug)}`,
      toDestinationPayload(parsed.data),
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/destinations');
  revalidatePath(`/destinations/${slug}/edit`);
  redirect('/destinations');
}

export interface DeleteDestinationState {
  error?: string;
}

/**
 * Deletes a destination (`DELETE /admin/destinations/:slug`). The API returns 409 when it's still
 * active or still has tours attached; `apiErrorMessage` surfaces that reason so the user knows to
 * deactivate or detach first.
 */
export async function deleteDestination(slug: string): Promise<DeleteDestinationState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/destinations/{slug}', {
      params: { path: { slug } },
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/destinations');
  return {};
}
