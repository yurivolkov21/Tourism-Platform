import { buildChatTools } from './tools';

// `ai` is ESM-only (v7) — jest's CJS runtime can't load it. `tool()` is an
// identity helper over the definition object, so an identity mock preserves
// exactly what production code passes through.
jest.mock('ai', () => ({
  tool: (def: unknown) => def,
}));

type ToolDef = {
  description: string;
  inputSchema: { safeParse: (v: unknown) => { success: boolean } };
  execute: (input: never) => Promise<unknown>;
};

const listResult = {
  items: [
    {
      id: 'uuid-1',
      slug: 'ha-long-cruise',
      title: 'Ha Long Cruise',
      summary: 'Two days on the bay',
      durationDays: 2,
      basePrice: '299.00',
      currency: 'USD',
      averageRating: 4.7,
      reviewsCount: 12,
      category: { name: 'Cruises' },
    },
  ],
  meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
};

function makeDeps() {
  const toursService = {
    findPublicList: jest.fn().mockResolvedValue(listResult),
    findPublicBySlug: jest.fn().mockResolvedValue({
      ...listResult.items[0],
      itinerary: [],
      faqs: [],
      policies: [],
      destinations: [],
    }),
  };
  const enquiryService = {
    create: jest.fn().mockResolvedValue({ id: 'enq-1', status: 'NEW' }),
  };
  return { toursService, enquiryService };
}

function makeTools(deps = makeDeps()) {
  return {
    deps,
    tools: buildChatTools({
      toursService: deps.toursService as never,
      enquiryService: deps.enquiryService as never,
    }) as unknown as Record<string, ToolDef>,
  };
}

describe('buildChatTools', () => {
  it('exposes exactly the three concierge tools', () => {
    const { tools } = makeTools();
    expect(Object.keys(tools).sort()).toEqual([
      'getTourDetails',
      'searchTours',
      'submitEnquiry',
    ]);
  });

  describe('searchTours', () => {
    it('queries the public list capped at 5 and returns trimmed summaries', async () => {
      const { tools, deps } = makeTools();
      const result = (await tools.searchTours.execute({
        search: 'cruise',
        category: 'cruises',
      } as never)) as { results: Array<{ slug: string }>; total: number };

      expect(deps.toursService.findPublicList).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'cruise',
          category: 'cruises',
          pageSize: 5,
        }),
      );
      expect(result.total).toBe(1);
      expect(result.results[0].slug).toBe('ha-long-cruise');
      expect((result.results[0] as Record<string, unknown>).id).toBeUndefined();
    });

    it('validates input with zod', () => {
      const { tools } = makeTools();
      expect(
        tools.searchTours.inputSchema.safeParse({ search: 'x' }).success,
      ).toBe(true);
      expect(
        tools.searchTours.inputSchema.safeParse({ search: 42 }).success,
      ).toBe(false);
    });
  });

  describe('getTourDetails', () => {
    it('returns the bot-shaped detail with booking path', async () => {
      const { tools } = makeTools();
      const result = (await tools.getTourDetails.execute({
        slug: 'ha-long-cruise',
      } as never)) as { bookingPath: string };
      expect(result.bookingPath).toBe('/tours/ha-long-cruise/book');
    });

    it('maps a missing tour to a friendly error result instead of throwing', async () => {
      const deps = makeDeps();
      deps.toursService.findPublicBySlug.mockRejectedValue(
        new Error('TOUR_NOT_FOUND'),
      );
      const { tools } = makeTools(deps);
      await expect(
        tools.getTourDetails.execute({ slug: 'nope' } as never),
      ).resolves.toEqual({ error: 'TOUR_NOT_FOUND' });
    });
  });

  describe('submitEnquiry', () => {
    it('resolves an optional tour slug to the tour id and creates the enquiry', async () => {
      const { tools, deps } = makeTools();
      const result = await tools.submitEnquiry.execute({
        name: 'Alice Nguyen',
        email: 'alice@example.com',
        message: 'Please quote a private Ha Long trip for 4 people.',
        tourSlug: 'ha-long-cruise',
        groupSize: 4,
      } as never);

      expect(deps.enquiryService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice Nguyen',
          email: 'alice@example.com',
          tourId: 'uuid-1',
          groupSize: 4,
        }),
      );
      expect(result).toEqual({ sent: true, replyEta: 'within 24 hours' });
    });

    it('still submits a general enquiry when the tour slug is unknown', async () => {
      const deps = makeDeps();
      deps.toursService.findPublicBySlug.mockRejectedValue(
        new Error('TOUR_NOT_FOUND'),
      );
      const { tools } = makeTools(deps);
      await tools.submitEnquiry.execute({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'General question about north Vietnam tours.',
        tourSlug: 'gone-tour',
      } as never);
      expect(deps.enquiryService.create).toHaveBeenCalledWith(
        expect.objectContaining({ tourId: undefined }),
      );
    });

    it('declares consent in its description and validates email', () => {
      const { tools } = makeTools();
      expect(tools.submitEnquiry.description).toMatch(/consent|permission/i);
      expect(
        tools.submitEnquiry.inputSchema.safeParse({
          name: 'Al',
          email: 'not-an-email',
          message: 'long enough message here',
        }).success,
      ).toBe(false);
    });
  });
});
