import type { TourSummary } from './data';
import { filterTourRows, type TourRowFilters } from './filter';

function makeTour(partial: {
  title: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  category?: { slug: string; name: string };
  destinations?: { slug: string; name: string; isPrimary?: boolean }[];
}): TourSummary {
  return {
    title: partial.title,
    isPublished: partial.isPublished ?? true,
    isFeatured: partial.isFeatured ?? false,
    category: partial.category ?? { slug: 'culture', name: 'Culture' },
    destinations: (partial.destinations ?? []).map((d) => ({
      isPrimary: d.isPrimary ?? false,
      destination: { slug: d.slug, name: d.name },
    })),
  } as TourSummary;
}

const HOI_AN = { slug: 'hoi-an', name: 'Hoi An' };
const HANOI = { slug: 'hanoi', name: 'Hanoi' };
const HUE = { slug: 'hue', name: 'Hue' };

const rows: TourSummary[] = [
  makeTour({
    title: 'Lantern Walk',
    destinations: [{ ...HOI_AN, isPrimary: true }, HUE],
    isFeatured: true,
  }),
  makeTour({
    title: 'Old Quarter Food Crawl',
    category: { slug: 'food', name: 'Food & Drink' },
    destinations: [HANOI],
  }),
  makeTour({
    title: 'Imperial Citadel Draft',
    isPublished: false,
    destinations: [HUE],
  }),
];

const none: TourRowFilters = {
  tab: 'all',
  categories: [],
  destinations: [],
  featuredOnly: false,
  query: '',
};

describe('filterTourRows', () => {
  it('passes everything through with no filters', () => {
    expect(filterTourRows(rows, none)).toHaveLength(3);
  });

  it('filters by publish tab', () => {
    expect(
      filterTourRows(rows, { ...none, tab: 'published' }).map((r) => r.title),
    ).toEqual(['Lantern Walk', 'Old Quarter Food Crawl']);
    expect(
      filterTourRows(rows, { ...none, tab: 'draft' }).map((r) => r.title),
    ).toEqual(['Imperial Citadel Draft']);
  });

  it('filters by category slugs (any-of)', () => {
    expect(
      filterTourRows(rows, { ...none, categories: ['food'] }).map(
        (r) => r.title,
      ),
    ).toEqual(['Old Quarter Food Crawl']);
  });

  it('matches the free-text query on title, category, and destination names', () => {
    expect(
      filterTourRows(rows, { ...none, query: 'lantern' }).map((r) => r.title),
    ).toEqual(['Lantern Walk']);
    expect(
      filterTourRows(rows, { ...none, query: 'food' }).map((r) => r.title),
    ).toEqual(['Old Quarter Food Crawl']);
    expect(
      filterTourRows(rows, { ...none, query: '  HUE ' }).map((r) => r.title),
    ).toEqual(['Lantern Walk', 'Imperial Citadel Draft']);
  });

  it('filters by destination slugs — a tour counts for every destination it has', () => {
    expect(
      filterTourRows(rows, { ...none, destinations: ['hue'] }).map(
        (r) => r.title,
      ),
    ).toEqual(['Lantern Walk', 'Imperial Citadel Draft']);
    expect(
      filterTourRows(rows, { ...none, destinations: ['hanoi', 'hoi-an'] }).map(
        (r) => r.title,
      ),
    ).toEqual(['Lantern Walk', 'Old Quarter Food Crawl']);
  });

  it('filters featured-only', () => {
    expect(
      filterTourRows(rows, { ...none, featuredOnly: true }).map((r) => r.title),
    ).toEqual(['Lantern Walk']);
  });

  it('composes all filters with AND', () => {
    expect(
      filterTourRows(rows, {
        tab: 'published',
        categories: ['culture'],
        destinations: ['hue'],
        featuredOnly: true,
        query: 'walk',
      }).map((r) => r.title),
    ).toEqual(['Lantern Walk']);
    expect(
      filterTourRows(rows, {
        ...none,
        destinations: ['hue'],
        featuredOnly: true,
        query: 'citadel',
      }),
    ).toHaveLength(0);
  });
});
