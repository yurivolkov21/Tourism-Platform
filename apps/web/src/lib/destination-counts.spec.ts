import type { DestinationTileVM } from './destinations.fixtures';
import { applyTourCounts, tallyToursByDestination } from './destination-counts';

function tour(...slugs: string[]) {
  return { destinations: slugs.map((slug) => ({ destination: { slug } })) };
}

function tile(slug: string): DestinationTileVM {
  return {
    slug,
    name: slug,
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: '',
    tourCount: 0,
    tagline: '',
    image: '',
    intro: '',
    gallery: [],
    tours: [],
  };
}

describe('tallyToursByDestination', () => {
  it('counts a tour for every destination it visits (M:N)', () => {
    const tours = [
      tour('ha-long-bay', 'hanoi', 'ninh-binh'),
      tour('ha-long-bay', 'hanoi'),
      tour('sa-pa'),
    ];
    expect(tallyToursByDestination(tours)).toEqual({
      'ha-long-bay': 2,
      hanoi: 2,
      'ninh-binh': 1,
      'sa-pa': 1,
    });
  });

  it('returns an empty map for no tours', () => {
    expect(tallyToursByDestination([])).toEqual({});
  });
});

describe('applyTourCounts', () => {
  it('sets each tile tourCount from the map, defaulting missing to 0', () => {
    const tiles = [tile('ha-long-bay'), tile('mui-ne')];
    const out = applyTourCounts(tiles, { 'ha-long-bay': 4 });
    expect(out.map((t) => [t.slug, t.tourCount])).toEqual([
      ['ha-long-bay', 4],
      ['mui-ne', 0],
    ]);
  });

  it('does not mutate the source tiles', () => {
    const tiles = [tile('ha-long-bay')];
    applyTourCounts(tiles, { 'ha-long-bay': 4 });
    expect(tiles[0].tourCount).toBe(0);
  });
});
