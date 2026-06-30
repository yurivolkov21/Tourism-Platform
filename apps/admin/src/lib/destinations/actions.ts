'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { assembleMediaSet, parseMediaField } from './media';
import { destinationSchema, toDestinationPayload } from './schema';

/**
 * Best-effort attach of the form's media set (`PUT /admin/destinations/:slug/media`, replace-all).
 * The destination is already saved at this point, so a failure here is swallowed — images can be
 * re-attached from the edit form (the Cloudinary upload already succeeded).
 */
async function putDestinationMedia(slug: string, mediaJson: string): Promise<void> {
  try {
    const media = assembleMediaSet(parseMediaField(mediaJson));
    await apiWrite('PUT', `/api/v1/admin/destinations/${encodeURIComponent(slug)}/media`, { media });
  } catch {
    // Saved without images; recoverable via edit.
  }
}

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

  let createdSlug: string;
  try {
    const created = await apiWrite<{ slug: string }>(
      'POST',
      '/api/v1/admin/destinations',
      toDestinationPayload(parsed.data),
    );
    createdSlug = created.slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  await putDestinationMedia(createdSlug, String(formData.get('media') ?? '[]'));
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

  await putDestinationMedia(slug, String(formData.get('media') ?? '[]'));
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

export interface SignParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

/** Signs a direct-to-Cloudinary upload for a destination image (hero or gallery). */
export async function signDestinationUpload(
  purpose: 'DESTINATION_HERO' | 'DESTINATION_GALLERY',
  filename: string,
  contentType: string,
): Promise<{ params?: SignParams; error?: string }> {
  try {
    const data = await apiWrite<SignParams>('POST', '/api/v1/admin/uploads/signed-url', {
      purpose,
      filename,
      contentType,
    });
    return { params: data };
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
}
