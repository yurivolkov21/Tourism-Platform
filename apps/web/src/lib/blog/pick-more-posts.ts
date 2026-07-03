import type { PostSummaryVM } from './post-vm';

/**
 * "More from the journal" selection: same-topic posts first, then recent ones as top-up.
 * Excludes the current post, dedupes by slug, preserves each source's order.
 */
export function pickMorePosts(
  tagged: PostSummaryVM[],
  recent: PostSummaryVM[],
  selfSlug: string,
  count = 3,
): PostSummaryVM[] {
  const out: PostSummaryVM[] = [];
  const seen = new Set([selfSlug]);
  for (const post of [...tagged, ...recent]) {
    if (seen.has(post.slug)) continue;
    seen.add(post.slug);
    out.push(post);
    if (out.length >= count) break;
  }
  return out;
}
