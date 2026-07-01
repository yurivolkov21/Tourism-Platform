import { z } from 'zod';

/** Enum option sources (mirror the API's `TravellerType` / `TourBadge`). Reused by the form UI. */
export const TRAVELLER_TYPES = ['FAMILY', 'COUPLE', 'FRIENDS', 'SOLO', 'BUSINESS'] as const;
export const TOUR_BADGES = ['BEST_VALUE', 'LIMITED_OFFER', 'EXCLUSIVE', 'NEW', 'POPULAR'] as const;
export const POLICY_KINDS = ['CANCELLATION', 'BOOKING', 'GENERAL'] as const;

const itemList = (max: number) =>
  z.array(z.string().trim().min(1).max(200, 'Each item must be 200 characters or fewer')).max(max);

const itineraryList = z
  .array(
    z.object({
      title: z.string().trim().min(1, 'Day title is required').max(200, 'Day title must be 200 characters or fewer'),
      description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer').optional(),
    }),
  )
  .max(60, 'At most 60 itinerary days');

const faqList = z
  .array(
    z.object({
      question: z.string().trim().min(1, 'Question is required').max(300, 'Question must be 300 characters or fewer'),
      answer: z.string().trim().min(1, 'Answer is required').max(2000, 'Answer must be 2000 characters or fewer'),
    }),
  )
  .max(30, 'At most 30 FAQs');

const policyList = z
  .array(
    z.object({
      kind: z.enum(POLICY_KINDS),
      title: z.string().trim().min(1, 'Policy title is required').max(200, 'Policy title must be 200 characters or fewer'),
      body: z.string().trim().min(1, 'Policy body is required').max(4000, 'Policy body must be 4000 characters or fewer'),
    }),
  )
  .max(20, 'At most 20 policies');

/**
 * Validation for the tour create/edit form. Mirrors `CreateTourDto` bounds — scalars + references +
 * enum/content arrays + the nested itinerary / FAQs / policies (replace-all; day/order assigned by
 * position in {@link toTourPayload}). The primary destination is refined to be one of the selected.
 */
export const tourSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
    slug: z.string().trim().max(200, 'Slug must be 200 characters or fewer').optional(),
    summary: z.string().trim().max(500, 'Summary must be 500 characters or fewer').optional(),

    categorySlug: z.string().trim().min(1, 'Pick a category'),
    destinationSlugs: z
      .array(z.string().trim().min(1))
      .min(1, 'Pick at least one destination')
      .max(20, 'At most 20 destinations'),
    primaryDestinationSlug: z.string().trim().min(1, 'Pick a primary destination'),

    durationDays: z.coerce
      .number()
      .int('Duration must be a whole number of days')
      .min(1, 'Duration must be at least 1 day')
      .max(60, 'Duration must be 60 days or fewer'),
    maxGroupSize: z.coerce
      .number()
      .int('Group size must be a whole number')
      .min(1, 'Group size must be at least 1')
      .max(100, 'Group size must be 100 or fewer')
      .optional(),
    meetingPoint: z.string().trim().max(300, 'Meeting point must be 300 characters or fewer').optional(),

    basePrice: z.coerce.number().min(0, 'Price must be 0 or greater'),
    compareAtPrice: z.coerce.number().min(0, 'Compare-at price must be 0 or greater').optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter code')
      .optional(),

    difficulty: z.string().trim().max(30, 'Difficulty must be 30 characters or fewer').optional(),
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),

    suitableFor: z.array(z.enum(TRAVELLER_TYPES)).max(5).optional(),
    badges: z.array(z.enum(TOUR_BADGES)).max(5).optional(),

    highlights: itemList(30).optional(),
    included: itemList(30).optional(),
    excluded: itemList(30).optional(),

    itinerary: itineraryList.optional(),
    faqs: faqList.optional(),
    policies: policyList.optional(),
  })
  .refine((v) => v.destinationSlugs.includes(v.primaryDestinationSlug), {
    message: 'Primary destination must be one of the selected destinations',
    path: ['primaryDestinationSlug'],
  });

export type TourInput = z.infer<typeof tourSchema>;

/**
 * Builds the API payload from validated input: always sends identity + references + required
 * logistics/pricing; drops empty optionals and empty arrays so the API applies its defaults and
 * leaves omitted sub-entities untouched.
 */
export function toTourPayload(input: TourInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: input.title,
    categorySlug: input.categorySlug,
    destinationSlugs: input.destinationSlugs,
    primaryDestinationSlug: input.primaryDestinationSlug,
    durationDays: input.durationDays,
    basePrice: input.basePrice,
  };

  for (const key of ['slug', 'summary', 'meetingPoint', 'difficulty', 'currency'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }
  if (typeof input.maxGroupSize === 'number') out.maxGroupSize = input.maxGroupSize;
  if (typeof input.compareAtPrice === 'number') out.compareAtPrice = input.compareAtPrice;
  if (typeof input.isPublished === 'boolean') out.isPublished = input.isPublished;
  if (typeof input.isFeatured === 'boolean') out.isFeatured = input.isFeatured;

  for (const key of ['suitableFor', 'badges', 'highlights', 'included', 'excluded'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }

  // Nested sub-entities: replace-all, position → dayNumber (1-based) / order (0-based). Empty lists
  // are omitted (the API leaves the existing set untouched), matching the content-array behaviour.
  if (input.itinerary && input.itinerary.length > 0) {
    out.itinerary = input.itinerary.map((d, i) => ({
      dayNumber: i + 1,
      title: d.title,
      ...(d.description ? { description: d.description } : {}),
    }));
  }
  if (input.faqs && input.faqs.length > 0) {
    out.faqs = input.faqs.map((f, i) => ({ question: f.question, answer: f.answer, order: i }));
  }
  if (input.policies && input.policies.length > 0) {
    out.policies = input.policies.map((p, i) => ({ kind: p.kind, title: p.title, body: p.body, order: i }));
  }

  return out;
}
