import type { components } from '../api/schema.js';

import {
  TOUR_CARD_IMAGE_FALLBACK,
  type TourBadgeKey,
  type TourCardData,
} from './tour-card.js';

type TourDetailDto = components['schemas']['TourDetailDto'];
type PublicReviewDto = components['schemas']['PublicReviewDto'];

export type TourDetailReview = {
  id: string;
  author: string;
  date: string;
  rating: number;
  quote: string;
};

export type TourDetailItineraryDay = {
  day: number;
  title: string;
  body: string;
};

export type TourDetailData = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destinationSlug: string;
  durationDays: number;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  badge?: TourBadgeKey;
  heroImage?: string;
  overview: string;
  gallery: string[];
  itinerary: TourDetailItineraryDay[];
  included: string[];
  notIncluded: string[];
  meals?: string;
  transport?: string;
  accommodation?: string;
  reviews: TourDetailReview[];
  faqs?: { question: string; answer: string }[];
  policies?: { kind: string; title: string; body: string }[];
};

/** "May 2024" from an ISO timestamp (graceful on a bad/empty value). */
export function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * The tour detail DTO has no discrete meals field, but multi-day packages list a
 * "N breakfasts, N lunches, N dinners" line in `included`.
 */
export function parseMealsLine(included: readonly string[]): string | undefined {
  return included.find((item) => /\d+\s*(breakfast|lunch|dinner)/i.test(item));
}

/** First `included` line that reads like transport (car / transfer / cruise / coach). */
export function parseTransportLine(included: readonly string[]): string | undefined {
  return included.find((item) => /transfer|car|cruise|coach|transport|van/i.test(item));
}

/** Duration-derived stay summary (the detail DTO has no accommodation field). */
export function buildAccommodation(durationDays: number): string | undefined {
  if (durationDays <= 0) return undefined;
  if (durationDays <= 1) return 'Day tour — no overnight stay';
  const nights = durationDays - 1;
  return `Hotel · ${nights} night${nights > 1 ? 's' : ''}`;
}

/** Hero merchandising badge — prefer BEST_VALUE, then POPULAR, then first badge. */
export function deriveHeroBadge(badges: readonly string[]): TourBadgeKey | undefined {
  if (badges.includes('BEST_VALUE')) return 'BEST_VALUE';
  if (badges.includes('POPULAR')) return 'POPULAR';
  const first = badges[0];
  if (!first) return undefined;
  return first as TourBadgeKey;
}

/** Cross-sell: other tours (current excluded), capped at limit. */
export function pickRelated(
  cards: readonly TourCardData[],
  currentSlug: string,
  limit = 4,
): TourCardData[] {
  return cards.filter((c) => c.slug !== currentSlug).slice(0, limit);
}

export function mapPublicReview(dto: PublicReviewDto): TourDetailReview {
  return {
    id: dto.id,
    author: dto.reviewer.fullName,
    date: formatReviewDate(dto.createdAt),
    rating: dto.rating,
    quote: dto.body,
  };
}

/** Maps a `TourDetailDto` (+ resolved reviews) into the detail view-model. */
export function toTourDetail(
  dto: TourDetailDto,
  reviews: TourDetailReview[] = [],
): TourDetailData {
  const primary = dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  const included = dto.included ?? [];

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    destination: primary?.destination.name ?? '',
    destinationSlug: primary?.destination.slug ?? '',
    durationDays: dto.durationDays,
    basePrice: Number(dto.basePrice),
    compareAtPrice: dto.compareAtPrice ? Number(dto.compareAtPrice) : undefined,
    currency: dto.currency,
    rating: dto.averageRating,
    reviewCount: dto.reviewsCount,
    badge: deriveHeroBadge(dto.badges ?? []),
    heroImage: hero?.url ?? TOUR_CARD_IMAGE_FALLBACK,
    overview: dto.summary ?? '',
    gallery: dto.media.map((m) => m.url).filter(Boolean),
    itinerary: dto.itinerary.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      body: d.description ?? '',
    })),
    included,
    notIncluded: dto.excluded ?? [],
    meals: parseMealsLine(included),
    transport: parseTransportLine(included),
    accommodation: buildAccommodation(dto.durationDays),
    reviews,
    faqs: dto.faqs.length > 0
      ? dto.faqs.map((f) => ({ question: f.question, answer: f.answer }))
      : undefined,
    policies: dto.policies.length > 0
      ? dto.policies.map((p) => ({ kind: p.kind, title: p.title, body: p.body }))
      : undefined,
  };
}
