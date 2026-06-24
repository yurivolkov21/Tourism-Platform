import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type Post = components['schemas']['PostDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface PostListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface PostList {
  data: Post[];
  meta: PageMeta;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Lists posts for the admin table (`GET /admin/posts`, drafts included). The wire format is already
 * `{ data, meta }` (the API's paginated envelope), so the typed body matches.
 */
export async function listPosts(params: PostListParams = {}): Promise<PostList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/posts', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
        search: params.search,
        status: params.status,
      },
    },
  });
  return data as unknown as PostList;
}

/**
 * Fetches one post by slug for the edit form. Single resources come back wrapped in the
 * `{ data, error }` envelope at runtime (the generated client types it bare), so we unwrap here.
 */
export async function getPost(slug: string): Promise<Post> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/posts/{slug}', {
    params: { path: { slug } },
  });
  return (data as unknown as { data: Post }).data;
}
