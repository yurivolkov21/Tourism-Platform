import type { TourCardData } from '../components/tours/tour-card';

/**
 * The tour detail DTO has no discrete meals field, but multi-day packages list a
 * "N breakfasts, N lunches, N dinners" line in `included`. Pull it out for the
 * meals spec row; day tours (no such line) fall back to a neutral label.
 */
export function parseMealsLine(included: readonly string[]): string | undefined {
  return included.find((item) => /\d+\s*(breakfast|lunch|dinner)/i.test(item));
}

/** First `included` line that reads like transport (car / transfer / cruise / coach). */
export function parseTransportLine(included: readonly string[]): string | undefined {
  return included.find((item) => /transfer|car|cruise|coach|transport|van/i.test(item));
}

/** Cross-sell: other tours (current excluded), capped at 4. */
export function pickRelated(
  cards: readonly TourCardData[],
  currentSlug: string,
  limit = 4,
): TourCardData[] {
  return cards.filter((c) => c.slug !== currentSlug).slice(0, limit);
}
