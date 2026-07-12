import type { TourCardData } from '../components/tours/tour-card';

export interface ItineraryDay {
  day: number;
  title: string;
  body: string;
  /** Meal codes provided that day, e.g. 'B / L / D' (breakfast / lunch / dinner). */
  meals?: string;
}

/** At-a-glance status chip shown on the hero (derived from rating / availability). */
export type TourBadge = 'bestSeller' | 'sellingFast';

/** Placeholder traveller review (review-only; replaced by the Review model from the API later). */
export interface TourReview {
  id: string;
  author: string;
  date: string;
  rating: number;
  quote: string;
}

export interface Departure {
  id: string;
  date: string;
  seatsLeft: number;
}

/** Tour-detail view-model: the card + generated placeholder detail (review-only; from API later). */
export interface TourDetailVM extends TourCardData {
  /** Real tour UUID (from the API) — needed by owner-scoped actions like the wishlist toggle. */
  id: string;
  destinationSlug: string;
  region: string;
  overview: string;
  gallery: string[];
  itinerary: ItineraryDay[];
  /** Marketing bullet points shown near the overview (empty when none). */
  highlights: string[];
  included: string[];
  notIncluded: string[];
  departures: Departure[];
  /** At-a-glance hero chip, or undefined when the tour is neither a top-seller nor low on seats. */
  badge?: TourBadge;
  /** Cross-sell: up to 4 other tours (same region first), for the "You might also like" grid. */
  related: TourCardData[];
  /** Ready-to-render meals summary (real tours: parsed from `included`; fixture: from `mealTotals`). */
  meals: string;
  /** Meal totals across the itinerary — fixture path only; the API has no per-day meal codes. */
  mealTotals?: { breakfast: number; lunch: number; dinner: number };
  /** Overview / inclusions specs (computed placeholders until real data lands from the API). */
  transport: string;
  accommodation: string;
  departureFrequency: string;
  /** A few placeholder traveller reviews for the detail page. */
  reviews: TourReview[];
  /** FAQs from the API (undefined → component falls back to the i18n copy). */
  faqs?: { question: string; answer: string }[];
  /** Policies from the API (undefined → component falls back to the i18n copy). */
  policies?: { kind: string; title: string; body: string }[];
}
