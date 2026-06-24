import { z } from 'zod';

/** Enum option sources (mirror the API's `TravellerType` / `TourBadge`). Reused by the form UI. */
export const TRAVELLER_TYPES = ['FAMILY', 'COUPLE', 'FRIENDS', 'SOLO', 'BUSINESS'] as const;
export const TOUR_BADGES = ['BEST_VALUE', 'LIMITED_OFFER', 'EXCLUSIVE', 'NEW', 'POPULAR'] as const;

const itemList = (max: number) =>
  z.array(z.string().trim().min(1).max(200, 'Each item must be 200 characters or fewer')).max(max);

/**
 * Validation for the tour create/edit form (increment-1 — scalar + reference + enum/content arrays;
 * itinerary/FAQs/policies/media/departures are out of scope). Mirrors `CreateTourDto` bounds. The
 * primary destination is refined to be one of the selected destinations.
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

  return out;
}
