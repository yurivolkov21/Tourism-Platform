import {
  buildActiveFilterChips,
  type FacetLabelMaps,
  type TourFilters,
} from './active-filter-chips.js';

const facetLabels: FacetLabelMaps = {
  duration: { '1': 'Day trip', '2-3': '2–3 days', '4+': '4+ days' },
  price: { '<100': 'Under $100', '100-300': '$100–$300', '300+': '$300+' },
  style: {
    family: 'Family',
    couples: 'Couples',
    adventure: 'Adventure',
    luxury: 'Luxury',
    group: 'Group',
    private: 'Private',
  },
  theme: {
    cruise: 'Cruise',
    trekking: 'Trekking',
    cultural: 'Cultural',
    culinary: 'Culinary',
    beach: 'Beach',
    nature: 'Nature',
  },
};

const categoryLabel = (slug: string) => (slug === 'trekking' ? 'Trekking' : slug);

describe('buildActiveFilterChips', () => {
  it('returns empty array when no filters are selected', () => {
    expect(buildActiveFilterChips({}, { categoryLabel, facetLabels })).toEqual([]);
    expect(
      buildActiveFilterChips(
        {
          destinations: [],
          categories: [],
          durations: [],
          styles: [],
          themes: [],
          prices: [],
        },
        { categoryLabel, facetLabels },
      ),
    ).toEqual([]);
  });

  it('builds chips with resolved labels per facet', () => {
    const filters: TourFilters = {
      destinations: ['Hà Nội'],
      categories: ['trekking'],
      durations: ['2-3'],
      styles: ['adventure'],
      themes: ['cultural'],
      prices: ['100-300'],
    };

    expect(buildActiveFilterChips(filters, { categoryLabel, facetLabels })).toEqual([
      { facet: 'destinations', value: 'Hà Nội', label: 'Hà Nội' },
      { facet: 'categories', value: 'trekking', label: 'Trekking' },
      { facet: 'durations', value: '2-3', label: '2–3 days' },
      { facet: 'styles', value: 'adventure', label: 'Adventure' },
      { facet: 'themes', value: 'cultural', label: 'Cultural' },
      { facet: 'prices', value: '100-300', label: '$100–$300' },
    ]);
  });

  it('preserves facet order: destinations → categories → durations → styles → themes → prices', () => {
    const filters: TourFilters = {
      prices: ['<100'],
      destinations: ['Sa Pa'],
    };

    const chips = buildActiveFilterChips(filters, { categoryLabel, facetLabels });
    expect(chips.map((c) => c.facet)).toEqual(['destinations', 'prices']);
  });
});
