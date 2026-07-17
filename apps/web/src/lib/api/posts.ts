import { cache } from 'react';

import type { components } from '@tourism/core';

import {
  toPostDetail,
  toPostSummary,
  type PostDetailVM,
  type PostSummaryVM,
} from '../blog/post-vm';
import { TAGS, postTag } from '../revalidate';
import { getApiClient } from './client';

type PaginatedPostsDto = components['schemas']['PaginatedPostsDto'];
type PostDetailDto = components['schemas']['PostDetailDto'];
type PostTagWithCountDto = components['schemas']['PostTagWithCountDto'];
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
  opts: {
    page?: number;
    pageSize?: number;
    tag?: string;
    search?: string;
  } = {},
): Promise<PostsPage> {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts', {
    params: {
      query: {
        page: opts.page ?? 1,
        pageSize: opts.pageSize ?? 12,
        ...(opts.tag ? { tag: opts.tag } : {}),
        ...(opts.search ? { search: opts.search } : {}),
      },
    },
    // Tagged: the API busts `posts` on post create/update/(un)publish/delete.
    next: { tags: [TAGS.POSTS] },
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
export const fetchPost = cache(
  async (slug: string): Promise<PostDetailVM | null> => {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/posts/{slug}', {
      params: { path: { slug } },
      // Tagged per post so an edit busts exactly this article.
      next: { tags: [postTag(slug)] },
    });
    const dto = (data as unknown as { data?: PostDetailDto } | undefined)?.data;
    if (error || !dto) return null;
    return toPostDetail(dto);
  },
);

/** Public tags in use (bare-array endpoint → enveloped at runtime). [] on error. */
export async function fetchPostTags(): Promise<PostTagWithCountDto[]> {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts/tags', {
    next: { tags: [TAGS.POSTS] },
  });
  const list = (data as unknown as { data?: PostTagWithCountDto[] } | undefined)
    ?.data;
  if (error || !list) return [];
  return list;
}
