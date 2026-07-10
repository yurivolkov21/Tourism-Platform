import type { DestinationTileVM } from './destinations.fixtures';
import { HOME_BENTO, pickHomeBento } from './home-bento';

/** Minimal tile factory — only fields the bento helper touches matter. */
function tile(slug: string): DestinationTileVM {
  return {
    slug,
    name: slug,
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: `${slug} desc`,
    tourCount: 0,
    tagline: `${slug} tagline`,
    image: `https://img/${slug}.jpg`,
    intro: '',
    gallery: [],
    tours: [],
  };
}

describe('pickHomeBento', () => {
  it('returns tiles in config order regardless of input order', () => {
    const tiles = [tile('hoi-an'), tile('ha-long-bay'), tile('sa-pa')];
    const config = [
      { slug: 'ha-long-bay' },
      { slug: 'sa-pa' },
      { slug: 'hoi-an' },
    ];

    expect(pickHomeBento(tiles, config).map((t) => t.slug)).toEqual([
      'ha-long-bay',
      'sa-pa',
      'hoi-an',
    ]);
  });

  it('skips configured slugs that are not in the tile list', () => {
    const tiles = [tile('ha-long-bay'), tile('hoi-an')];
    const config = [
      { slug: 'ha-long-bay' },
      { slug: 'missing' },
      { slug: 'hoi-an' },
    ];

    expect(pickHomeBento(tiles, config).map((t) => t.slug)).toEqual([
      'ha-long-bay',
      'hoi-an',
    ]);
  });

  it('applies the span from the config slot', () => {
    const tiles = [tile('ha-long-bay')];
    const config = [
      { slug: 'ha-long-bay', span: 'lg:col-span-2 lg:row-span-2' },
    ];

    expect(pickHomeBento(tiles, config)[0].span).toBe(
      'lg:col-span-2 lg:row-span-2',
    );
  });

  it('does not mutate the source tile', () => {
    const source = tile('ha-long-bay');
    pickHomeBento([source], [{ slug: 'ha-long-bay', span: 'lg:col-span-2' }]);

    expect(source.span).toBeUndefined();
  });

  it('returns an empty array for empty input', () => {
    expect(pickHomeBento([])).toEqual([]);
  });

  it('HOME_BENTO is the curated six in layout order', () => {
    expect(HOME_BENTO.map((s) => s.slug)).toEqual([
      'ha-long-bay',
      'sa-pa',
      'hoi-an',
      'hue',
      'ho-chi-minh-city',
      'mekong-delta',
    ]);
  });
});
