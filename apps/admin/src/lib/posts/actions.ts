'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { flashPath } from '../flash';
import { assembleMediaSet, parseMediaField } from '../media';
import { parseJsonStringArray, postSchema, toPostPayload } from './schema';

export interface PostFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Attaches the form's cover set (`PUT /admin/posts/:slug/media`, replace-all). The post is
 * already saved; a failure here is RETURNED (not swallowed) so the form can tell the admin the
 * post exists but the cover didn't attach — e.g. the 400 MEDIA_ROLE_CONFLICT when a body image
 * is picked as the cover (adversarial-review fix; the old silent swallow showed a false success).
 */
async function putPostMedia(
  slug: string,
  mediaJson: string,
): Promise<string | null> {
  try {
    const media = assembleMediaSet(parseMediaField(mediaJson));
    await apiWrite(
      'PUT',
      `/api/v1/admin/posts/${encodeURIComponent(slug)}/media`,
      { media },
    );
    return null;
  } catch (e) {
    return apiErrorMessage(e);
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
    metaTitle: String(formData.get('metaTitle') ?? ''),
    metaDescription: String(formData.get('metaDescription') ?? ''),
    // The ISO instant from the form's hidden field (browser-side TZ conversion).
    publishedAt: String(formData.get('publishedAtIso') ?? ''),
    tags: parseJsonStringArray(formData.get('tags')),
    relatedTourSlugs: parseJsonStringArray(formData.get('relatedTourSlugs')),
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
      toPostPayload(parsed.data, 'create'),
    );
    createdSlug = created.slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  const createMediaError = await putPostMedia(
    createdSlug,
    String(formData.get('media') ?? '[]'),
  );
  if (createMediaError) {
    revalidatePath('/posts');
    return {
      error: `The post was saved, but the cover could not be attached: ${createMediaError}`,
    };
  }
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
      toPostPayload(parsed.data, 'update'),
    );
    savedSlug = updated.slug ?? slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  const updateMediaError = await putPostMedia(
    savedSlug,
    String(formData.get('media') ?? '[]'),
  );
  if (updateMediaError) {
    revalidatePath('/posts');
    revalidatePath(`/posts/${savedSlug}/edit`);
    return {
      error: `The post was saved, but the cover could not be attached: ${updateMediaError}`,
    };
  }
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
    await api.DELETE('/api/v1/admin/posts/{slug}', {
      params: { path: { slug } },
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/posts');
  return {};
}
