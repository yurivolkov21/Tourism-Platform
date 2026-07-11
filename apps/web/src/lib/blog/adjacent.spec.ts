import { pickAdjacentPosts } from './adjacent';

import type { PostSummaryVM } from './post-vm';

const post = (slug: string): PostSummaryVM => ({
  slug,
  title: slug.toUpperCase(),
  excerpt: '',
  metaTitle: null,
  metaDescription: null,
  publishedAt: null,
  coverUrl: null,
  coverAlt: null,
  tags: [],
  author: { fullName: null, avatarUrl: null },
});

// Newest-first, matching the public list API's order.
const posts = [post('newest'), post('middle'), post('oldest')];

describe('pickAdjacentPosts', () => {
  it('returns both neighbors for a middle post', () => {
    expect(pickAdjacentPosts(posts, 'middle')).toEqual({
      newer: posts[0],
      older: posts[2],
    });
  });

  it('has no newer neighbor for the newest post', () => {
    expect(pickAdjacentPosts(posts, 'newest')).toEqual({
      newer: null,
      older: posts[1],
    });
  });

  it('has no older neighbor for the oldest post', () => {
    expect(pickAdjacentPosts(posts, 'oldest')).toEqual({
      newer: posts[1],
      older: null,
    });
  });

  it('returns nulls when the slug is not in the window', () => {
    expect(pickAdjacentPosts(posts, 'ghost')).toEqual({
      newer: null,
      older: null,
    });
  });

  it('returns nulls for an empty list', () => {
    expect(pickAdjacentPosts([], 'any')).toEqual({ newer: null, older: null });
  });
});
