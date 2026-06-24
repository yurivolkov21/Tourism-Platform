import { z } from 'zod';

/**
 * Validation for the tour-category create/edit form. Mirrors the API's `CreateTourCategoryDto`
 * (name required 1–120; optional slug/description with length caps; `order` int ≥0; `isActive`).
 * Empty optional strings are allowed here and normalized away before sending.
 */
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be 120 characters or fewer'),
  slug: z.string().trim().max(60, 'Slug must be 60 characters or fewer').optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional(),
  order: z.coerce
    .number()
    .int('Order must be a whole number')
    .min(0, 'Order must be 0 or greater')
    .optional(),
  isActive: z.boolean().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/** Drops empty-string optionals so the API payload omits them (and so slug can auto-generate). */
export function toCategoryPayload(input: CategoryInput): Record<string, unknown> {
  const out: Record<string, unknown> = { name: input.name };
  for (const key of ['slug', 'description'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }
  if (typeof input.order === 'number' && Number.isFinite(input.order)) out.order = input.order;
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}
