import { z } from 'zod';

/**
 * Validation for the destination create/edit form. Mirrors the API's `CreateDestinationDto`
 * (name required 1–120; optional slug/country/region/description with length caps; `isActive`).
 * Empty optional strings are allowed here and normalized to `undefined` before sending.
 */
export const destinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
  slug: z
    .string()
    .trim()
    .max(80, 'Slug must be 80 characters or fewer')
    .optional(),
  country: z
    .string()
    .trim()
    .max(60, 'Country must be 60 characters or fewer')
    .optional(),
  region: z
    .string()
    .trim()
    .max(80, 'Region must be 80 characters or fewer')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional(),
  isActive: z.boolean().optional(),
});

export type DestinationInput = z.infer<typeof destinationSchema>;

/** Drops empty-string optionals so the API payload omits them (and so slug can auto-generate). */
export function toDestinationPayload(
  input: DestinationInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = { name: input.name };
  for (const key of ['slug', 'country', 'region', 'description'] as const) {
    const value = input[key];
    if (value && value.length > 0) out[key] = value;
  }
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}
