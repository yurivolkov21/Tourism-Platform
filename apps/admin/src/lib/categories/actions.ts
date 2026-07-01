'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { flashPath } from '../flash';
import { categorySchema, toCategoryPayload } from './schema';

export interface CategoryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Validates raw form fields against `categorySchema`; returns the parsed input or field errors. */
function parseCategoryForm(formData: FormData) {
  const orderRaw = String(formData.get('order') ?? '').trim();
  return categorySchema.safeParse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: String(formData.get('description') ?? ''),
    order: orderRaw === '' ? undefined : orderRaw,
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

/** Creates a category (`POST /admin/tour-categories`); maps a 409 to a friendly slug-conflict message. */
export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    await apiWrite('POST', '/api/v1/admin/tour-categories', toCategoryPayload(parsed.data));
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/categories');
  redirect(flashPath('/categories', 'created'));
}

/** Updates a category (`PATCH /admin/tour-categories/:slug`); the slug is bound at call sites. */
export async function updateCategory(
  slug: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    await apiWrite(
      'PATCH',
      `/api/v1/admin/tour-categories/${encodeURIComponent(slug)}`,
      toCategoryPayload(parsed.data),
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/categories');
  revalidatePath(`/categories/${slug}/edit`);
  redirect(flashPath('/categories', 'updated'));
}

export interface DeleteCategoryState {
  error?: string;
}

/**
 * Deletes a category (`DELETE /admin/tour-categories/:slug`). The API returns 409 when it's still
 * active or still has tours attached; `apiErrorMessage` surfaces that reason so the user knows to
 * deactivate or detach first.
 */
export async function deleteCategory(slug: string): Promise<DeleteCategoryState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/tour-categories/{slug}', {
      params: { path: { slug } },
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/categories');
  return {};
}
