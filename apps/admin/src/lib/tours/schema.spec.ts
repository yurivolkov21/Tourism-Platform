import { tourSchema, toTourPayload, type TourInput } from './schema';

const base = {
  title: 'Hoi An Walking Tour',
  categorySlug: 'day-tours',
  destinationSlugs: ['hoi-an', 'da-nang'],
  primaryDestinationSlug: 'hoi-an',
  durationDays: 1,
  basePrice: 49.5,
};

describe('tourSchema', () => {
  it('accepts a minimal valid tour', () => {
    expect(tourSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(tourSchema.safeParse({ ...base, title: '' }).success).toBe(false);
  });

  it('requires at least one destination', () => {
    expect(tourSchema.safeParse({ ...base, destinationSlugs: [] }).success).toBe(false);
  });

  it('rejects a primary destination not in the selected list', () => {
    const r = tourSchema.safeParse({ ...base, primaryDestinationSlug: 'sa-pa' });
    expect(r.success).toBe(false);
  });

  it('coerces numeric-string duration and price', () => {
    const r = tourSchema.safeParse({ ...base, durationDays: '3', basePrice: '120.50' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.durationDays).toBe(3);
      expect(r.data.basePrice).toBe(120.5);
    }
  });

  it('rejects duration out of range', () => {
    expect(tourSchema.safeParse({ ...base, durationDays: 0 }).success).toBe(false);
    expect(tourSchema.safeParse({ ...base, durationDays: 61 }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(tourSchema.safeParse({ ...base, basePrice: -1 }).success).toBe(false);
  });

  it('rejects a bad currency code', () => {
    expect(tourSchema.safeParse({ ...base, currency: 'dollars' }).success).toBe(false);
  });

  it('rejects an unknown traveller type / badge', () => {
    expect(tourSchema.safeParse({ ...base, suitableFor: ['ALIEN'] }).success).toBe(false);
    expect(tourSchema.safeParse({ ...base, badges: ['SHINY'] }).success).toBe(false);
  });

  it('accepts valid enum arrays and content arrays', () => {
    const r = tourSchema.safeParse({
      ...base,
      suitableFor: ['FAMILY', 'COUPLE'],
      badges: ['BEST_VALUE'],
      highlights: ['Lantern-lit old town'],
    });
    expect(r.success).toBe(true);
  });
});

describe('toTourPayload', () => {
  it('keeps required fields and drops empty optionals/arrays', () => {
    const input = tourSchema.parse(base) as TourInput;
    expect(toTourPayload(input)).toEqual({
      title: 'Hoi An Walking Tour',
      categorySlug: 'day-tours',
      destinationSlugs: ['hoi-an', 'da-nang'],
      primaryDestinationSlug: 'hoi-an',
      durationDays: 1,
      basePrice: 49.5,
    });
  });

  it('includes set optionals, enum arrays, and content arrays', () => {
    const input = tourSchema.parse({
      ...base,
      summary: 'A stroll',
      currency: 'usd',
      compareAtPrice: 69,
      isPublished: true,
      suitableFor: ['SOLO'],
      included: ['Guide', 'Water'],
    }) as TourInput;
    const out = toTourPayload(input);
    expect(out.summary).toBe('A stroll');
    expect(out.currency).toBe('usd');
    expect(out.compareAtPrice).toBe(69);
    expect(out.isPublished).toBe(true);
    expect(out.suitableFor).toEqual(['SOLO']);
    expect(out.included).toEqual(['Guide', 'Water']);
  });
});
