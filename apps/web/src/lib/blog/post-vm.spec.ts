import type { components } from '@tourism/core';

import { fallbackExcerpt, toPostDetail, toPostSummary } from './post-vm';

type PostDto = components['schemas']['PostDto'];
type MediaItemDto = components['schemas']['MediaItemDto'];

const media = (role: MediaItemDto['role'], url: string): MediaItemDto => ({
  publicId: `tourism/posts/${url}`,
  url,
  type: 'IMAGE',
  role,
});

const base: PostDto = {
  id: 'p1',
  slug: 'hoi-an',
  title: 'Two unhurried days in Hoi An',
  excerpt: 'Lanterns and tailors.',
  content: '## Day 1\n\nRiverside mornings.',
  status: 'PUBLISHED',
  publishedAt: '2026-06-01T00:00:00.000Z',
  authorId: 'u1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  media: [],
};

describe('toPostSummary', () => {
  it('picks the hero-role cover over other roles', () => {
    const vm = toPostSummary({ ...base, media: [media('gallery', 'g.jpg'), media('hero', 'h.jpg')] });
    expect(vm.coverUrl).toBe('h.jpg');
  });

  it('falls back to the first attachment, then null', () => {
    expect(toPostSummary({ ...base, media: [media('gallery', 'g.jpg')] }).coverUrl).toBe('g.jpg');
    expect(toPostSummary(base).coverUrl).toBeNull();
  });

  it('uses the stored excerpt when present', () => {
    expect(toPostSummary(base).excerpt).toBe('Lanterns and tailors.');
  });

  it('derives a plain-text excerpt when the stored one is missing or blank', () => {
    expect(toPostSummary({ ...base, excerpt: null }).excerpt).toBe('Day 1 Riverside mornings.');
    expect(toPostSummary({ ...base, excerpt: '   ' }).excerpt).toBe('Day 1 Riverside mornings.');
  });

  it('passes publishedAt through (null stays null)', () => {
    expect(toPostSummary(base).publishedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(toPostSummary({ ...base, publishedAt: null }).publishedAt).toBeNull();
  });
});

describe('toPostDetail', () => {
  it('adds the markdown content to the summary projection', () => {
    const vm = toPostDetail(base);
    expect(vm.content).toBe(base.content);
    expect(vm.slug).toBe('hoi-an');
    expect(vm.coverUrl).toBeNull();
  });
});

describe('fallbackExcerpt', () => {
  it('strips markdown syntax, links, and collapses whitespace', () => {
    expect(fallbackExcerpt('## Title\n\n**bold** [link](https://x.com)')).toBe('Title bold link');
  });

  it('clamps long content on a word boundary with an ellipsis', () => {
    const long = Array.from({ length: 60 }, () => 'word').join(' ');
    const out = fallbackExcerpt(long);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('wor…'); // never cuts mid-word
  });

  it('returns short content unchanged', () => {
    expect(fallbackExcerpt('Just a short line.')).toBe('Just a short line.');
  });
});
