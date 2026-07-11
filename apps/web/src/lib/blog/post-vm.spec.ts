import type { components } from '@tourism/core';

import { fallbackExcerpt, toPostDetail, toPostSummary } from './post-vm';

type PostDto = components['schemas']['PostDto'];
type PostDetailDto = components['schemas']['PostDetailDto'];
type TourSummaryDto = components['schemas']['TourSummaryDto'];
type MediaItemDto = components['schemas']['MediaItemDto'];

const media = (role: MediaItemDto['role'], url: string): MediaItemDto => ({
  publicId: `tourism/posts/${url}`,
  url,
  type: 'IMAGE',
  role,
});

const tourSummary = (slug: string): TourSummaryDto =>
  ({
    id: `id-${slug}`,
    slug,
    title: `Tour ${slug}`,
    summary: null,
    durationDays: 3,
    basePrice: '499',
    compareAtPrice: null,
    currency: 'USD',
    isFeatured: false,
    badges: [],
    suitableFor: [],
    category: { slug: 'cruises', name: 'Cruises' },
    destinations: [],
    media: [
      {
        publicId: 'p',
        url: 'https://cdn/hero.jpg',
        type: 'IMAGE',
        role: 'hero',
      },
    ],
    averageRating: 4.5,
    reviewsCount: 10,
    nextDepartureDate: null,
    nextDepartureSeatsLeft: null,
  }) as TourSummaryDto;

const base: PostDto = {
  id: 'p1',
  slug: 'hoi-an',
  title: 'Two unhurried days in Hoi An',
  excerpt: 'Lanterns and tailors.',
  metaTitle: null,
  metaDescription: null,
  content: '## Day 1\n\nRiverside mornings.',
  status: 'PUBLISHED',
  publishedAt: '2026-06-01T00:00:00.000Z',
  authorId: 'u1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  media: [],
  tags: [],
  author: { fullName: null, avatarUrl: null },
};

describe('toPostSummary', () => {
  it('picks the hero-role cover over other roles', () => {
    const vm = toPostSummary({
      ...base,
      media: [media('gallery', 'g.jpg'), media('hero', 'h.jpg')],
    });
    expect(vm.coverUrl).toBe('h.jpg');
  });

  it('falls back to the first attachment, then null', () => {
    expect(
      toPostSummary({ ...base, media: [media('gallery', 'g.jpg')] }).coverUrl,
    ).toBe('g.jpg');
    expect(toPostSummary(base).coverUrl).toBeNull();
  });

  it('uses the stored excerpt when present', () => {
    expect(toPostSummary(base).excerpt).toBe('Lanterns and tailors.');
  });

  it('derives a plain-text excerpt when the stored one is missing or blank', () => {
    expect(toPostSummary({ ...base, excerpt: null }).excerpt).toBe(
      'Day 1 Riverside mornings.',
    );
    expect(toPostSummary({ ...base, excerpt: '   ' }).excerpt).toBe(
      'Day 1 Riverside mornings.',
    );
  });

  it('passes publishedAt through (null stays null)', () => {
    expect(toPostSummary(base).publishedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(
      toPostSummary({ ...base, publishedAt: null }).publishedAt,
    ).toBeNull();
  });

  it('passes metaTitle/metaDescription through (null stays null)', () => {
    expect(toPostSummary(base).metaTitle).toBeNull();
    expect(toPostSummary(base).metaDescription).toBeNull();
    const vm = toPostSummary({
      ...base,
      metaTitle: 'Hoi An in 3 days',
      metaDescription: 'A short SEO description.',
    });
    expect(vm.metaTitle).toBe('Hoi An in 3 days');
    expect(vm.metaDescription).toBe('A short SEO description.');
  });
});

describe('toPostDetail', () => {
  it('adds the markdown content to the summary projection', () => {
    const vm = toPostDetail(base);
    expect(vm.content).toBe(base.content);
    expect(vm.slug).toBe('hoi-an');
    expect(vm.coverUrl).toBeNull();
  });

  it('exposes updatedAt, null-guarded for older APIs (deploy-lag)', () => {
    expect(toPostDetail(base).updatedAt).toBe('2026-05-02T00:00:00.000Z');
    const legacy = { ...base } as Record<string, unknown>;
    delete legacy.updatedAt;
    expect(
      toPostDetail(legacy as unknown as PostDetailDto).updatedAt,
    ).toBeNull();
  });
});

describe('fallbackExcerpt', () => {
  it('strips markdown syntax, links, and collapses whitespace', () => {
    expect(fallbackExcerpt('## Title\n\n**bold** [link](https://x.com)')).toBe(
      'Title bold link',
    );
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

describe('tags + author on summaries', () => {
  it('passes tags and author through', () => {
    const vm = toPostSummary({
      ...base,
      tags: [{ slug: 'ha-long', name: 'Hạ Long' }],
      author: { fullName: 'Ana', avatarUrl: 'https://cdn/a.jpg' },
    });
    expect(vm.tags).toEqual([{ slug: 'ha-long', name: 'Hạ Long' }]);
    expect(vm.author).toEqual({
      fullName: 'Ana',
      avatarUrl: 'https://cdn/a.jpg',
    });
  });

  it('defaults tags/author when an older API omits them (deploy-lag)', () => {
    const legacy = { ...base } as Record<string, unknown>;
    delete legacy.tags;
    delete legacy.author;
    const vm = toPostSummary(legacy as unknown as typeof base);
    expect(vm.tags).toEqual([]);
    expect(vm.author).toEqual({ fullName: null, avatarUrl: null });
  });
});

describe('toPostDetail related tours', () => {
  it('maps relatedTours through toTourCard (pick order kept)', () => {
    const dto: PostDetailDto = {
      ...base,
      relatedTours: [tourSummary('first'), tourSummary('second')],
    };
    const vm = toPostDetail(dto);
    expect(vm.relatedTours.map((t) => t.slug)).toEqual(['first', 'second']);
    expect(vm.relatedTours[0].image).toBe('https://cdn/hero.jpg');
    expect(vm.relatedTours[0].rating).toBe(4.5);
  });

  it('defaults relatedTours to [] when absent (deploy-lag)', () => {
    const vm = toPostDetail({ ...base } as unknown as PostDetailDto);
    expect(vm.relatedTours).toEqual([]);
  });
});
