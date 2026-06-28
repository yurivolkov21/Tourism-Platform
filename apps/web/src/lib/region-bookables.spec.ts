import type { TourCardData } from '../components/tours/tour-card';
import { selectRegionBookables, type RegionTile } from './region-bookables';

const tile = (name: string, slug: string, region: string): RegionTile => ({ name, slug, region });

const tour = (slug: string, destination: string): TourCardData => ({
  slug,
  title: slug,
  destination,
  durationDays: 2,
  basePrice: 100,
  currency: 'USD',
  rating: 4.8,
  reviewCount: 10,
  badges: [],
});

const tiles: RegionTile[] = [
  tile('Sa Pa', 'sa-pa', 'Northern Vietnam'),
  tile('Hạ Long Bay', 'ha-long-bay', 'Northern Vietnam'),
  tile('Hội An', 'hoi-an', 'Central Vietnam'),
  tile('Mekong Delta', 'mekong-delta', 'Southern Vietnam'),
];

const tours: TourCardData[] = [
  tour('sa-pa-trek', 'Sa Pa'),
  tour('ha-long-cruise', 'Hạ Long Bay'),
  tour('hoi-an-walk', 'Hội An'),
  tour('mystery', 'Somewhere Else'),
];

describe('selectRegionBookables', () => {
  it('returns the destinations within the region (name + slug), in order', () => {
    const { destinations } = selectRegionBookables(tiles, tours, 'Northern Vietnam');
    expect(destinations).toEqual([
      { name: 'Sa Pa', slug: 'sa-pa' },
      { name: 'Hạ Long Bay', slug: 'ha-long-bay' },
    ]);
  });

  it('keeps only tours whose destination is in the region', () => {
    const { tours: result } = selectRegionBookables(tiles, tours, 'Northern Vietnam');
    expect(result.map((t) => t.slug)).toEqual(['sa-pa-trek', 'ha-long-cruise']);
  });

  it('excludes tours whose destination is not in the catalogue / region', () => {
    const { tours: result } = selectRegionBookables(tiles, tours, 'Central Vietnam');
    expect(result.map((t) => t.slug)).toEqual(['hoi-an-walk']);
  });

  it('returns empty for an unknown region', () => {
    expect(selectRegionBookables(tiles, tours, 'Atlantis')).toEqual({
      destinations: [],
      tours: [],
    });
  });

  it('does not mutate the inputs', () => {
    const tilesBefore = tiles.map((t) => t.slug);
    const toursBefore = tours.map((t) => t.slug);
    selectRegionBookables(tiles, tours, 'Northern Vietnam');
    expect(tiles.map((t) => t.slug)).toEqual(tilesBefore);
    expect(tours.map((t) => t.slug)).toEqual(toursBefore);
  });
});
