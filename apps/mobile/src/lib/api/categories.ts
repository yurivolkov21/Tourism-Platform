import { getApiClient } from './client';

export interface CategoryOption {
  slug: string;
  name: string;
}

export async function fetchActiveCategories(): Promise<CategoryOption[]> {
  try {
    const api = getApiClient();
    const { data } = await api.GET('/api/v1/tour-categories');
    const list = (data as { data?: { slug: string; name: string }[] }).data ?? [];
    return list.map((c) => ({ slug: c.slug, name: c.name }));
  } catch {
    return [];
  }
}
