import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type Category = components['schemas']['TourCategoryDto'];
/** Admin detail shape — the category plus its tours (superset of {@link Category}). */
export type CategoryDetail =
  components['schemas']['AdminTourCategoryDetailDto'];
export type CategoryTour = components['schemas']['CategoryTourDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface CategoryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CategoryList {
  data: Category[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists tour categories for the admin table (`GET /admin/tour-categories`, inactive included). The
 * wire format is already `{ data, meta }` (the API's paginated envelope), so the typed body matches.
 */
export async function listCategories(
  params: CategoryListParams = {},
): Promise<CategoryList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/tour-categories', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        search: params.search,
      },
    },
  });
  return data as unknown as CategoryList;
}

/**
 * Fetches one tour category by slug for the edit form. Single resources come back wrapped in the
 * `{ data, error }` envelope at runtime (the generated client types it bare), so we unwrap here.
 */
export async function getCategory(slug: string): Promise<CategoryDetail> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/tour-categories/{slug}', {
    params: { path: { slug } },
  });
  return (data as unknown as { data: CategoryDetail }).data;
}
