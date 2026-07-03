import type { PostSummaryVM } from './post-vm';
import { pickMorePosts } from './pick-more-posts';

const post = (slug: string): PostSummaryVM => ({
  slug,
  title: slug,
  excerpt: 'x',
  publishedAt: null,
  coverUrl: null,
  tags: [],
  author: { fullName: null, avatarUrl: null },
});

describe('pickMorePosts', () => {
  it('prefers tagged posts, tops up with recent, excludes self, dedupes', () => {
    const tagged = [post('self'), post('a'), post('b')];
    const recent = [post('a'), post('c'), post('d')];
    expect(pickMorePosts(tagged, recent, 'self').map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });

  it('caps at count and preserves source order', () => {
    const tagged = [post('a'), post('b'), post('c'), post('d')];
    expect(pickMorePosts(tagged, [], 'self', 2).map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('returns fewer (or none) when sources run dry', () => {
    expect(pickMorePosts([], [post('self')], 'self')).toEqual([]);
    expect(pickMorePosts([post('x')], [], 'self').map((p) => p.slug)).toEqual(['x']);
  });
});
