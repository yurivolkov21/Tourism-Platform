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
    expect(
      tourSchema.safeParse({ ...base, destinationSlugs: [] }).success,
    ).toBe(false);
  });

  it('rejects a primary destination not in the selected list', () => {
    const r = tourSchema.safeParse({
      ...base,
      primaryDestinationSlug: 'sa-pa',
    });
    expect(r.success).toBe(false);
  });

  it('coerces numeric-string duration and price', () => {
    const r = tourSchema.safeParse({
      ...base,
      durationDays: '3',
      basePrice: '120.50',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.durationDays).toBe(3);
      expect(r.data.basePrice).toBe(120.5);
    }
  });

  it('rejects duration out of range', () => {
    expect(tourSchema.safeParse({ ...base, durationDays: 0 }).success).toBe(
      false,
    );
    expect(tourSchema.safeParse({ ...base, durationDays: 61 }).success).toBe(
      false,
    );
  });

  it('rejects a negative price', () => {
    expect(tourSchema.safeParse({ ...base, basePrice: -1 }).success).toBe(
      false,
    );
  });

  it('rejects a bad currency code', () => {
    expect(tourSchema.safeParse({ ...base, currency: 'dollars' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown traveller type / badge', () => {
    expect(
      tourSchema.safeParse({ ...base, suitableFor: ['ALIEN'] }).success,
    ).toBe(false);
    expect(tourSchema.safeParse({ ...base, badges: ['SHINY'] }).success).toBe(
      false,
    );
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

  it('accepts valid itinerary / FAQs / policies', () => {
    const r = tourSchema.safeParse({
      ...base,
      itinerary: [
        { title: 'Day one', description: 'Arrive' },
        { title: 'Day two' },
      ],
      faqs: [{ question: 'Pickup?', answer: 'Yes' }],
      policies: [
        { kind: 'CANCELLATION', title: 'Free cancel', body: 'Up to 24h' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects an itinerary day / FAQ / policy missing a required field', () => {
    expect(
      tourSchema.safeParse({ ...base, itinerary: [{ title: '' }] }).success,
    ).toBe(false);
    expect(
      tourSchema.safeParse({ ...base, faqs: [{ question: 'Q', answer: '' }] })
        .success,
    ).toBe(false);
    expect(
      tourSchema.safeParse({
        ...base,
        policies: [{ kind: 'NOPE', title: 'T', body: 'B' }],
      }).success,
    ).toBe(false);
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

  it('assigns dayNumber (1-based) + order (0-based) to nested lists by position', () => {
    const input = tourSchema.parse({
      ...base,
      itinerary: [{ title: 'One', description: 'D1' }, { title: 'Two' }],
      faqs: [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
      ],
      policies: [{ kind: 'CANCELLATION', title: 'C', body: 'cb' }],
    }) as TourInput;
    const out = toTourPayload(input);
    expect(out.itinerary).toEqual([
      { dayNumber: 1, title: 'One', description: 'D1' },
      { dayNumber: 2, title: 'Two' },
    ]);
    expect(out.faqs).toEqual([
      { question: 'Q1', answer: 'A1', order: 0 },
      { question: 'Q2', answer: 'A2', order: 1 },
    ]);
    expect(out.policies).toEqual([
      { kind: 'CANCELLATION', title: 'C', body: 'cb', order: 0 },
    ]);
  });

  it('omits empty nested lists (API leaves them untouched)', () => {
    const input = tourSchema.parse({
      ...base,
      itinerary: [],
      faqs: [],
      policies: [],
    }) as TourInput;
    const out = toTourPayload(input);
    expect(out.itinerary).toBeUndefined();
    expect(out.faqs).toBeUndefined();
    expect(out.policies).toBeUndefined();
  });
});
