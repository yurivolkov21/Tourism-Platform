import { z } from 'zod';

/** Departure status options (mirror the API's `DepartureStatus`). Reused by the form select. */
export const DEPARTURE_STATUSES = ['OPEN', 'CLOSED', 'CANCELLED'] as const;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

/**
 * Validation for the departure create/edit form. Mirrors `CreateDepartureDto`: ISO dates with
 * `endDate ≥ startDate`, `seatsTotal` 1–1000, optional decimal price overrides, status enum.
 * `seatsBooked` is never part of the form (booking-flow owned).
 */
export const departureSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    seatsTotal: z.coerce
      .number()
      .int('Seats must be a whole number')
      .min(1, 'At least 1 seat')
      .max(1000, 'At most 1000 seats'),
    priceOverride: z.coerce
      .number()
      .min(0, 'Price must be 0 or greater')
      .optional(),
    compareAtPrice: z.coerce
      .number()
      .min(0, 'Compare-at price must be 0 or greater')
      .optional(),
    status: z.enum(DEPARTURE_STATUSES).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export type DepartureInput = z.infer<typeof departureSchema>;

/** Builds the API payload: always sends dates + seats; includes price overrides/status only when set. */
export function toDeparturePayload(
  input: DepartureInput,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    startDate: input.startDate,
    endDate: input.endDate,
    seatsTotal: input.seatsTotal,
  };
  if (typeof input.priceOverride === 'number')
    out.priceOverride = input.priceOverride;
  if (typeof input.compareAtPrice === 'number')
    out.compareAtPrice = input.compareAtPrice;
  if (input.status) out.status = input.status;
  return out;
}
