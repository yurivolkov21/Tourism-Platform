import type { PostSummaryVM } from './post-vm';

export interface AdjacentPosts {
  /** Published just after the current post (list is newest-first → the entry before it). */
  newer: PostSummaryVM | null;
  /** Published just before the current post (the entry after it). */
  older: PostSummaryVM | null;
}

/**
 * Chronological neighbors of `slug` within the newest-first summary list (the same
 * 100-post window `generateStaticParams` uses). Absent slug → both null (beyond the
 * window, or a deploy edge) — the nav simply doesn't render.
 */
export function pickAdjacentPosts(
  posts: PostSummaryVM[],
  slug: string,
): AdjacentPosts {
  const i = posts.findIndex((p) => p.slug === slug);
  if (i < 0) return { newer: null, older: null };
  return {
    newer: i > 0 ? posts[i - 1] : null,
    older: i < posts.length - 1 ? posts[i + 1] : null,
  };
}
