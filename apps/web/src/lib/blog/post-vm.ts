import type { components } from '@tourism/core';

type PostDto = components['schemas']['PostDto'];

/** Card/list projection of a post (no body). */
export interface PostSummaryVM {
  slug: string;
  title: string;
  /** Stored excerpt, else derived from `content` — never empty for real content. */
  excerpt: string;
  /** ISO timestamp; null-safe (defensive — public posts are published, but don't crash). */
  publishedAt: string | null;
  /** Hero-role cover url, else the first attachment, else null (covers are optional). */
  coverUrl: string | null;
}

/** Full article projection (summary + markdown body). */
export interface PostDetailVM extends PostSummaryVM {
  content: string;
}

const EXCERPT_MAX = 160;

/** Plain-text excerpt from markdown (same stripping as `readingStats`), clamped on a word. */
export function fallbackExcerpt(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= EXCERPT_MAX) return plain;
  const cut = plain.slice(0, EXCERPT_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : EXCERPT_MAX).trimEnd()}…`;
}

function pickCoverUrl(dto: PostDto): string | null {
  const media = dto.media ?? [];
  return (media.find((m) => m.role === 'hero') ?? media[0])?.url ?? null;
}

export function toPostSummary(dto: PostDto): PostSummaryVM {
  return {
    slug: dto.slug,
    title: dto.title,
    excerpt: dto.excerpt?.trim() || fallbackExcerpt(dto.content),
    publishedAt: dto.publishedAt,
    coverUrl: pickCoverUrl(dto),
  };
}

export function toPostDetail(dto: PostDto): PostDetailVM {
  return { ...toPostSummary(dto), content: dto.content };
}
