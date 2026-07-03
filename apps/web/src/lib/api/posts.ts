import { cache } from 'react';

import type { components } from '@tourism/core';

import {
  toPostDetail,
  toPostSummary,
  type PostDetailVM,
  type PostSummaryVM,
} from '../blog/post-vm';
import { getApiClient } from './client';

type PaginatedPostsDto = components['schemas']['PaginatedPostsDto'];
type PostDto = components['schemas']['PostDto'];
type PageMetaDto = components['schemas']['PageMetaDto'];

export interface PostsPage {
  posts: PostSummaryVM[];
  meta: PageMetaDto;
}

/**
 * One page of published posts, newest first. List responses map 1:1 (`{ data, meta }` IS the
 * body — no `.data` unwrap, unlike the single-resource fetch below). Throws on an API error so
 * callers pick their own degradation (home falls back to fixtures; `/blog` shows a notice).
 */
export async function fetchPosts(
  opts: { page?: number; pageSize?: number } = {},
): Promise<PostsPage> {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts', {
    params: { query: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 12 } },
  });
  const body = data as unknown as PaginatedPostsDto | undefined;
  if (error || !body) throw new Error('Failed to load posts');
  return { posts: body.data.map(toPostSummary), meta: body.meta };
}

/** Published post slugs for `generateStaticParams`/sitemap (empty on error → on-demand). */
export async function fetchPostSlugs(): Promise<string[]> {
  const page = await fetchPosts({ pageSize: 100 }).catch(() => null);
  return page?.posts.map((p) => p.slug) ?? [];
}

/**
 * Full article for a slug, or `null` when unknown/unpublished. The single-resource response is
 * enveloped (`{ data }`) → unwrap `.data` (envelope gotcha). Wrapped in React `cache()` so
 * `generateMetadata` and the page body share one fetch per request.
 */
export const fetchPost = cache(async (slug: string): Promise<PostDetailVM | null> => {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts/{slug}', {
    params: { path: { slug } },
  });
  const dto = (data as unknown as { data?: PostDto } | undefined)?.data;
  if (error || !dto) return null;
  return toPostDetail(dto);
});
