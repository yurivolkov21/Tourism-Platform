'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { flashPath } from '../flash';
import { postSchema, toPostPayload } from './schema';

export interface PostFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
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

  try {
    await apiWrite('POST', '/api/v1/admin/posts', toPostPayload(parsed.data));
  } catch (e) {
    return { error: apiErrorMessage(e) };
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

  try {
    await apiWrite(
      'PATCH',
      `/api/v1/admin/posts/${encodeURIComponent(slug)}`,
      toPostPayload(parsed.data),
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/posts');
  revalidatePath(`/posts/${slug}/edit`);
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
