import type { DestinationTileVM } from './destinations.fixtures';
import { pickFeaturedDestinations } from './featured-destinations';

function tile(slug: string): DestinationTileVM {
  return {
    slug,
    name: slug,
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: '',
    tourCount: 0,
    tagline: '',
    image: `https://img/${slug}.jpg`,
    intro: '',
    gallery: [],
    tours: [],
  };
}

const north = [
  tile('hanoi'),
  tile('ha-long-bay'),
  tile('ninh-binh'),
  tile('sa-pa'),
  tile('ha-giang'),
];

describe('pickFeaturedDestinations', () => {
  it('returns the curated 4 in curated order, dropping the non-featured one', () => {
    const out = pickFeaturedDestinations(north, 'Northern Vietnam');
    expect(out.map((t) => t.slug)).toEqual([
      'ha-long-bay',
      'sa-pa',
      'ninh-binh',
      'hanoi',
    ]);
    expect(out).toHaveLength(4);
  });

  it('caps at 4 even when the region has more', () => {
    expect(pickFeaturedDestinations(north, 'Northern Vietnam')).toHaveLength(4);
  });

  it('pads to 4 from the rest when a curated slug is missing', () => {
    // Drop a curated slug (hanoi); ha-giang should pad to keep the row full.
    const items = north.filter((t) => t.slug !== 'hanoi');
    const out = pickFeaturedDestinations(items, 'Northern Vietnam');
    expect(out.map((t) => t.slug)).toEqual([
      'ha-long-bay',
      'sa-pa',
      'ninh-binh',
      'ha-giang',
    ]);
  });

  it('falls back to the first N (input order) for an unknown region', () => {
    const out = pickFeaturedDestinations(north, 'Other', 4);
    expect(out.map((t) => t.slug)).toEqual([
      'hanoi',
      'ha-long-bay',
      'ninh-binh',
      'sa-pa',
    ]);
  });

  it('returns all when fewer than the limit are available', () => {
    const items = [tile('ha-long-bay'), tile('sa-pa')];
    expect(
      pickFeaturedDestinations(items, 'Northern Vietnam').map((t) => t.slug),
    ).toEqual(['ha-long-bay', 'sa-pa']);
  });

  it('does not mutate the input array', () => {
    const items = [...north];
    pickFeaturedDestinations(items, 'Northern Vietnam');
    expect(items.map((t) => t.slug)).toEqual([
      'hanoi',
      'ha-long-bay',
      'ninh-binh',
      'sa-pa',
      'ha-giang',
    ]);
  });
});
