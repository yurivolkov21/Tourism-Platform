import { tool } from 'ai';
import { z } from 'zod';

import type { EnquiryService } from '../enquiry/enquiry.service';
import type { ToursService } from '../tours/tours.service';
import { toTourDetailForBot, toTourSummary } from './shape';

/**
 * Concierge tool belt (AI SDK `tool()` over existing services — in-process,
 * no HTTP hop). Read-only except `submitEnquiry`, which is consent-gated in
 * the system prompt, re-validated server-side by CreateEnquiryDto, and
 * HARD-CAPPED at one enquiry per request — build a FRESH tool belt per
 * request so the closure counter resets (adversarial review finding 1:
 * a prompt-injected model could otherwise flood the CRM/outbox in one turn).
 */
export function buildChatTools(deps: {
  toursService: ToursService;
  enquiryService: EnquiryService;
}) {
  const { toursService, enquiryService } = deps;
  let enquiriesSent = 0;

  const resolveTourId = async (slug?: string): Promise<string | undefined> => {
    if (!slug) return undefined;
    try {
      const tour = await toursService.findPublicBySlug(slug);
      return (tour as { id: string }).id;
    } catch {
      return undefined; // unknown slug → general enquiry, never a hard failure
    }
  };

  return {
    searchTours: tool({
      description:
        'Search the published tour catalog. Use when the traveller asks what tours exist, or filters by interest, destination or category. Returns up to 5 matches.',
      inputSchema: z.object({
        search: z
          .string()
          .max(120)
          .optional()
          .describe('Free-text match on tour titles'),
        category: z
          .string()
          .max(60)
          .optional()
          .describe('Category slug, e.g. "cruises"'),
        destination: z
          .string()
          .max(80)
          .optional()
          .describe('Destination slug, e.g. "ha-long"'),
        featured: z.boolean().optional(),
      }),
      execute: async (input) => {
        const { items, meta } = await toursService.findPublicList({
          ...input,
          page: 1,
          pageSize: 5,
        } as never);
        return {
          results: (items as never[]).map((item) => toTourSummary(item)),
          total: (meta as { total: number }).total,
        };
      },
    }),

    getTourDetails: tool({
      description:
        'Full detail of one tour by slug: itinerary, FAQs, policies, inclusions, meeting point, booking path. Use before answering specifics about a tour.',
      inputSchema: z.object({
        slug: z.string().min(1).max(120),
      }),
      execute: async ({ slug }) => {
        try {
          const tour = await toursService.findPublicBySlug(slug);
          return toTourDetailForBot(tour as never);
        } catch {
          return { error: 'TOUR_NOT_FOUND' };
        }
      },
    }),

    submitEnquiry: tool({
      description:
        'Send the traveller details to the Nexora team as a CRM enquiry. Call ONLY after the traveller has given explicit consent to send it (state what you will send and ask first).',
      inputSchema: z.object({
        name: z.string().min(2).max(120),
        email: z.email().max(200),
        message: z.string().min(10).max(2000),
        tourSlug: z.string().max(120).optional(),
        travelDate: z
          .string()
          .max(30)
          .optional()
          .describe('Approximate date, ISO if known'),
        groupSize: z.number().int().min(1).max(100).optional(),
        nationality: z.string().max(80).optional(),
      }),
      execute: async ({ tourSlug, ...enquiry }) => {
        if (enquiriesSent >= 1) {
          return {
            sent: false,
            error: 'ENQUIRY_ALREADY_SENT',
            hint: 'One enquiry per message — tell the traveller it was already submitted.',
          };
        }
        enquiriesSent += 1;
        const tourId = await resolveTourId(tourSlug);
        await enquiryService.create({ ...enquiry, tourId } as never);
        return { sent: true, replyEta: 'within 24 hours' };
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof buildChatTools>;
