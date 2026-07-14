import { toTourDetailForBot, toTourSummary, windowHistory } from './shape';

describe('windowHistory', () => {
  it('returns the last N items, preserving order', () => {
    const msgs = Array.from({ length: 30 }, (_, i) => ({ i }));
    const windowed = windowHistory(msgs, 20);
    expect(windowed).toHaveLength(20);
    expect(windowed[0]).toEqual({ i: 10 });
    expect(windowed[19]).toEqual({ i: 29 });
  });

  it('returns everything when under the limit', () => {
    const msgs = [{ i: 0 }, { i: 1 }];
    expect(windowHistory(msgs, 20)).toEqual(msgs);
  });
});

const listItem = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Cruise',
  summary: 'Two days on the bay',
  durationDays: 2,
  basePrice: '299.00',
  currency: 'USD',
  averageRating: 4.7,
  reviewsCount: 12,
  media: [{ url: 'http://cdn/x.jpg' }],
  category: { id: 'c1', slug: 'cruises', name: 'Cruises' },
};

describe('toTourSummary', () => {
  it('keeps the token-lean sales fields', () => {
    expect(toTourSummary(listItem)).toEqual({
      slug: 'ha-long-cruise',
      title: 'Ha Long Cruise',
      summary: 'Two days on the bay',
      durationDays: 2,
      priceFrom: '299.00 USD',
      rating: 4.7,
      reviewsCount: 12,
      category: 'Cruises',
    });
  });

  it('drops ids and media', () => {
    const summary = toTourSummary(listItem) as Record<string, unknown>;
    expect(summary.id).toBeUndefined();
    expect(summary.media).toBeUndefined();
  });
});

const detail = {
  ...listItem,
  included: ['Meals'],
  excluded: ['Flights'],
  highlights: ['Sunset kayak'],
  meetingPoint: 'Hanoi Old Quarter',
  maxGroupSize: 12,
  difficulty: 'easy',
  itinerary: [
    { id: 'i1', day: 1, title: 'Embark', description: 'Board the boat' },
  ],
  faqs: [{ id: 'f1', question: 'Is lunch included?', answer: 'Yes', order: 0 }],
  policies: [
    {
      id: 'p1',
      kind: 'CANCELLATION',
      title: 'Cancellation',
      body: '48h notice',
      order: 0,
    },
  ],
  destinations: [{ destination: { name: 'Ha Long', slug: 'ha-long' } }],
};

describe('toTourDetailForBot', () => {
  it('keeps itinerary, faqs and policies as plain text fields', () => {
    const bot = toTourDetailForBot(detail);
    expect(bot.itinerary).toEqual([
      { day: 1, title: 'Embark', description: 'Board the boat' },
    ]);
    expect(bot.faqs).toEqual([
      { question: 'Is lunch included?', answer: 'Yes' },
    ]);
    expect(bot.policies).toEqual([
      { kind: 'CANCELLATION', title: 'Cancellation', body: '48h notice' },
    ]);
    expect(bot.bookingPath).toBe('/tours/ha-long-cruise/book');
  });

  it('drops ids, media and any cost fields', () => {
    const bot = toTourDetailForBot({
      ...detail,
      costPrice: '100.00',
    } as never) as Record<string, unknown>;
    expect(bot.id).toBeUndefined();
    expect(bot.media).toBeUndefined();
    expect(bot.costPrice).toBeUndefined();
  });
});
