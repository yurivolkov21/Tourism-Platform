import { getBySlug } from '@tourism/core';

import type { TourCardData } from '../components/tours/tour-card';
import { destinations } from './destinations.fixtures';

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

/** Every tour across the destination fixtures, deduped by slug (input order preserved). */
export function allTours(): TourCardData[] {
  const seen = new Set<string>();
  const out: TourCardData[] = [];
  for (const destination of destinations) {
    for (const tour of destination.tours) {
      if (!seen.has(tour.slug)) {
        seen.add(tour.slug);
        out.push(tour);
      }
    }
  }
  return out;
}

/** Tour slugs for `generateStaticParams`. */
export function tourSlugs(): string[] {
  return allTours().map((tour) => tour.slug);
}

export function getTourBySlug(slug: string): TourCardData | undefined {
  return getBySlug(allTours(), slug);
}

// The destination (with its region + imagery) that owns a tour.
function ownerOf(slug: string) {
  return destinations.find((d) => d.tours.some((t) => t.slug === slug));
}

// Standard inclusions — the same placeholder set for every tour until real data lands.
const INCLUDED: readonly string[] = [
  'Private air-conditioned transfers, door to door',
  'A knowledgeable English-speaking local guide',
  'All entrance fees and permits on the itinerary',
  'Meals as listed (B / L / D) and bottled water',
  'Accommodation on multi-day trips',
];
const NOT_INCLUDED: readonly string[] = [
  'International and domestic flights',
  'Travel insurance (required)',
  'Personal expenses, drinks and tips',
  'Anything not listed under “included”',
];

function buildItinerary(destination: string, days: number): ItineraryDay[] {
  if (days <= 1) {
    return [
      {
        day: 1,
        title: `A full day in ${destination}`,
        body: `Morning hotel pickup, a guided day through the highlights and hidden corners of ${destination}, then a relaxed transfer back in the evening.`,
        meals: 'L',
      },
    ];
  }
  const itinerary: ItineraryDay[] = [];
  for (let day = 1; day <= days; day += 1) {
    if (day === 1) {
      itinerary.push({
        day,
        title: `Arrival in ${destination}`,
        body: `Meet your guide, settle in, and take an orientation walk to get your bearings around ${destination}.`,
        meals: 'D',
      });
    } else if (day === days) {
      itinerary.push({
        day,
        title: 'Departure',
        body: 'A relaxed final morning with time for any last sights or souvenirs before your onward transfer.',
        meals: 'B',
      });
    } else {
      itinerary.push({
        day,
        title: `Exploring ${destination}`,
        body: `A full day discovering the landscapes, culture and food of ${destination} at an unhurried pace.`,
        meals: 'B / L / D',
      });
    }
  }
  return itinerary;
}

/** "13 breakfasts · 9 lunches · 1 dinner" from meal totals (omits zero courses). */
function formatMeals(totals: {
  breakfast: number;
  lunch: number;
  dinner: number;
}): string {
  const parts: string[] = [];
  if (totals.breakfast)
    parts.push(
      `${totals.breakfast} breakfast${totals.breakfast > 1 ? 's' : ''}`,
    );
  if (totals.lunch)
    parts.push(`${totals.lunch} lunch${totals.lunch > 1 ? 'es' : ''}`);
  if (totals.dinner)
    parts.push(`${totals.dinner} dinner${totals.dinner > 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'Meals as listed';
}

/** Tally how many breakfasts / lunches / dinners the itinerary's meal codes add up to. */
function computeMealTotals(itinerary: ItineraryDay[]): {
  breakfast: number;
  lunch: number;
  dinner: number;
} {
  return itinerary.reduce(
    (acc, day) => {
      if (day.meals?.includes('B')) acc.breakfast += 1;
      if (day.meals?.includes('L')) acc.lunch += 1;
      if (day.meals?.includes('D')) acc.dinner += 1;
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0 },
  );
}

// Placeholder transport / accommodation summaries derived from the destination + duration.
function buildTransport(destination: string): string {
  return /ha long|lan ha|bay/i.test(destination)
    ? 'Private air-conditioned car · overnight cruise'
    : 'Private air-conditioned car';
}

function buildAccommodation(days: number): string {
  if (days <= 1) return 'Day tour — no overnight stay';
  const nights = days - 1;
  return `Hotel · ${nights} night${nights > 1 ? 's' : ''}`;
}

// Placeholder traveller-review pool — picked deterministically per slug until the Review API lands.
const REVIEW_POOL: readonly Omit<TourReview, 'id'>[] = [
  {
    author: 'Charlotte P.',
    date: 'May 2024',
    rating: 5,
    quote:
      'Everything was perfect from the moment we started planning. Our guide was warm, knowledgeable and endlessly patient with the kids.',
  },
  {
    author: 'Mansoor A.',
    date: 'Apr 2024',
    rating: 5,
    quote:
      'My first trip to Vietnam and I couldn’t have asked for a smoother experience — every transfer on time, every hotel a lovely surprise.',
  },
  {
    author: 'Christine H.',
    date: 'Mar 2024',
    rating: 5,
    quote:
      'We booked our whole North Vietnam trip with them. A few changes along the way, no problem at all — and the hotels were superb.',
  },
  {
    author: 'Daniel & Mai',
    date: 'Mar 2024',
    rating: 5,
    quote:
      'Very lovely staff, always quick to answer questions. A genuinely relaxing, well-run trip from start to finish.',
  },
  {
    author: 'Priya B.',
    date: 'Feb 2024',
    rating: 5,
    quote:
      'Spectacular. Eleven days, ten nights and not a single dull moment. Huge thanks to the whole team.',
  },
  {
    author: 'Tom R.',
    date: 'Feb 2024',
    rating: 4,
    quote:
      'Outstanding support and service throughout. From the very first message we felt genuinely looked after.',
  },
];

function buildReviews(slug: string): TourReview[] {
  const start = slug.length % REVIEW_POOL.length;
  return Array.from({ length: 3 }, (_, i) => ({
    id: `${slug}-rev-${i}`,
    ...REVIEW_POOL[(start + i) % REVIEW_POOL.length],
  }));
}

/** Cross-sell pool: other tours, same region first, capped at 4 (pads with other regions). */
function relatedTours(slug: string, region: string): TourCardData[] {
  const sameRegion: TourCardData[] = [];
  const others: TourCardData[] = [];
  for (const tour of allTours()) {
    if (tour.slug === slug) continue;
    const owner = ownerOf(tour.slug);
    (owner?.region === region ? sameRegion : others).push(tour);
  }
  return [...sameRegion, ...others].slice(0, 4);
}

/** Hero status chip: a strong rating + review count reads "Best seller"; low remaining seats reads
 * "Likely to sell out". Otherwise no chip. Placeholder heuristic until real signals land from the API. */
function deriveBadge(
  tour: TourCardData,
  departures: Departure[],
): TourBadge | undefined {
  if (tour.rating >= 4.7 && tour.reviewCount >= 40) return 'bestSeller';
  const minSeats =
    departures.length > 0
      ? Math.min(...departures.map((d) => d.seatsLeft))
      : Infinity;
  if (minSeats <= 4) return 'sellingFast';
  return undefined;
}

function buildDepartures(slug: string): Departure[] {
  const now = new Date();
  const seats = [4, 8, 12];
  return [30, 60, 90].map((offset, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    return {
      id: `${slug}-${i}`,
      date: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      seatsLeft: seats[i],
    };
  });
}

/** Build the full detail VM for a tour, or `undefined` if the slug is unknown. */
export function getTourDetail(slug: string): TourDetailVM | undefined {
  const tour = getTourBySlug(slug);
  if (!tour) return undefined;
  const owner = ownerOf(slug);
  const gallery = Array.from(
    new Set(
      [tour.image, owner?.image, ...(owner?.gallery ?? [])].filter(
        (src): src is string => Boolean(src),
      ),
    ),
  );

  const region = owner?.region ?? '';
  const departures = buildDepartures(slug);
  const itinerary = buildItinerary(tour.destination, tour.durationDays);
  const mealTotals = computeMealTotals(itinerary);

  return {
    ...tour,
    id: slug, // fixtures are slug-keyed (this path isn't used by the live API-backed page)
    destinationSlug: owner?.slug ?? '',
    region,
    overview: owner?.intro ?? '',
    gallery,
    itinerary,
    highlights: [],
    included: [...INCLUDED],
    notIncluded: [...NOT_INCLUDED],
    departures,
    badge: deriveBadge(tour, departures),
    related: relatedTours(slug, region),
    meals: formatMeals(mealTotals),
    mealTotals,
    transport: buildTransport(tour.destination),
    accommodation: buildAccommodation(tour.durationDays),
    departureFrequency: 'Daily',
    reviews: buildReviews(slug),
  };
}
