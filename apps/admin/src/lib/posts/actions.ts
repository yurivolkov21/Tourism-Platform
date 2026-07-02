'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { flashPath } from '../flash';
import { assembleMediaSet, parseMediaField } from '../media';
import { postSchema, toPostPayload } from './schema';

export interface PostFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Best-effort attach of the form's cover set (`PUT /admin/posts/:slug/media`, replace-all). The
 * post is already saved, so a failure here is swallowed — the cover can be re-attached from edit.
 */
async function putPostMedia(slug: string, mediaJson: string): Promise<void> {
  try {
    const media = assembleMediaSet(parseMediaField(mediaJson));
    await apiWrite('PUT', `/api/v1/admin/posts/${encodeURIComponent(slug)}/media`, { media });
  } catch {
    // Saved without a cover; recoverable via edit.
  }
}

/** Validates raw form fields against `postSchema`. The author is taken from the JWT by the API. */
function parsePostForm(formData: FormData) {
  return postSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    excerpt: String(formData.get('excerpt') ?? ''),
    content: String(formData.get('content') ?? ''),
    status: (() => {
      const v = String(formData.get('status') ?? '').trim();
      return v === '' ? undefined : v;
    })(),
  });
}

function toFieldErrors(error: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Creates a post (`POST /admin/posts`, author from JWT); maps 409 to a friendly slug-conflict message. */
export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const parsed = parsePostForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  let createdSlug: string;
  try {
    const created = await apiWrite<{ slug: string }>(
      'POST',
      '/api/v1/admin/posts',
      toPostPayload(parsed.data),
    );
    createdSlug = created.slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  await putPostMedia(createdSlug, String(formData.get('media') ?? '[]'));
  revalidatePath('/posts');
  redirect(flashPath('/posts', 'created'));
}

/** Updates a post (`PATCH /admin/posts/:slug`); the slug is bound at call sites. */
export async function updatePost(
  slug: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const parsed = parsePostForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  let savedSlug = slug;
  try {
    const updated = await apiWrite<{ slug: string }>(
      'PATCH',
      `/api/v1/admin/posts/${encodeURIComponent(slug)}`,
      toPostPayload(parsed.data),
    );
    savedSlug = updated.slug ?? slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  await putPostMedia(savedSlug, String(formData.get('media') ?? '[]'));
  revalidatePath('/posts');
  revalidatePath(`/posts/${savedSlug}/edit`);
  redirect(flashPath('/posts', 'updated'));
}

export interface DeletePostState {
  error?: string;
}

/** Deletes a post (`DELETE /admin/posts/:slug`). No 409 path — posts are always deletable. */
export async function deletePost(slug: string): Promise<DeletePostState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/posts/{slug}', { params: { path: { slug } } });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/posts');
  return {};
}
