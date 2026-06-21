import { REGION_ORDER, groupByRegion, getBySlug } from './destinations.js';

type Row = { slug: string; region: string | null };
const rows: Row[] = [
  { slug: 'hoi-an', region: 'Central Vietnam' },
  { slug: 'ha-long-bay', region: 'Northern Vietnam' },
  { slug: 'mekong-delta', region: 'Southern Vietnam' },
  { slug: 'sa-pa', region: 'Northern Vietnam' },
  { slug: 'mystery', region: null },
];

describe('REGION_ORDER', () => {
  it('is North → Central → South', () => {
    expect(REGION_ORDER).toEqual(['Northern Vietnam', 'Central Vietnam', 'Southern Vietnam']);
  });
});

describe('groupByRegion', () => {
  it('groups and orders N→C→S with unknown/null last', () => {
    const groups = groupByRegion(rows);
    expect(groups.map((g) => g.region)).toEqual([
      'Northern Vietnam',
      'Central Vietnam',
      'Southern Vietnam',
      'Other',
    ]);
  });

  it('keeps input order stable within a group', () => {
    const groups = groupByRegion(rows);
    const north = groups.find((g) => g.region === 'Northern Vietnam');
    expect(north?.items.map((r) => r.slug)).toEqual(['ha-long-bay', 'sa-pa']);
  });

  it('returns [] for empty input', () => {
    expect(groupByRegion([])).toEqual([]);
  });
});

describe('getBySlug', () => {
  it('finds a matching row', () => {
    expect(getBySlug(rows, 'sa-pa')?.region).toBe('Northern Vietnam');
  });
  it('returns undefined when missing', () => {
    expect(getBySlug(rows, 'nope')).toBeUndefined();
  });
});
