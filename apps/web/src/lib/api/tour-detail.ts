import { cache } from 'react';

import type { components } from '@tourism/core';

import type {
  TourBadgeKey,
  TourCardData,
} from '../../components/tours/tour-card';
import type { ItineraryDay, TourDetailVM, TourReview } from '../tours';
import {
  parseMealsLine,
  parseTransportLine,
  pickRelated,
} from '../tour-detail-derive';
import { tourTag } from '../revalidate';
import { getApiClient } from './client';
import { fetchTourCards, knownTravellerTypes } from './tours';

type TourDetailDto = components['schemas']['TourDetailDto'];
type PublicReviewDto = components['schemas']['PublicReviewDto'];

/** "May 2024" from an ISO timestamp (graceful on a bad/empty value). */
function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Duration-derived stay summary (the detail DTO has no accommodation field). */
function buildAccommodation(durationDays: number): string {
  if (durationDays <= 1) return 'Day tour — no overnight stay';
  const nights = durationDays - 1;
  return `Hotel · ${nights} night${nights > 1 ? 's' : ''}`;
}

/** Hero status chip: a merchandising badge reads as "Best seller"; otherwise none. */
function deriveBadge(badges: readonly string[]): TourDetailVM['badge'] {
  return badges.includes('POPULAR') || badges.includes('BEST_VALUE')
    ? 'bestSeller'
    : undefined;
}

function toTourReview(dto: PublicReviewDto): TourReview {
  return {
    id: dto.id,
    author: dto.reviewer.fullName,
    date: formatReviewDate(dto.createdAt),
    rating: dto.rating,
    quote: dto.body,
  };
}

/** Maps a `TourDetailDto` (+ resolved reviews & related) into the detail view-model. */
export function toTourDetail(
  dto: TourDetailDto,
  reviews: TourReview[],
  related: TourCardData[],
): TourDetailVM {
  const primary =
    dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  const included = dto.included ?? [];
  const itinerary: ItineraryDay[] = dto.itinerary.map((d) => ({
    day: d.dayNumber,
    title: d.title,
    body: d.description ?? '',
  }));

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    destination: primary?.destination.name ?? '',
    durationDays: dto.durationDays,
    basePrice: Number(dto.basePrice),
    compareAtPrice: dto.compareAtPrice ? Number(dto.compareAtPrice) : undefined,
    currency: dto.currency,
    rating: dto.averageRating,
    reviewCount: dto.reviewsCount,
    badges: (dto.badges ?? []) as TourBadgeKey[],
    image: hero?.url,
    imageAlt: hero?.alt,
    summary: dto.summary ?? undefined,
    suitableFor: knownTravellerTypes(dto.suitableFor),
    destinationSlug: primary?.destination.slug ?? '',
    region: '',
    overview: dto.summary ?? '',
    gallery: dto.media.map((m) => m.url),
    itinerary,
    highlights: dto.highlights ?? [],
    included,
    notIncluded: dto.excluded ?? [],
    departures: [],
    badge: deriveBadge(dto.badges ?? []),
    related,
    meals: parseMealsLine(included) ?? 'Meals as listed',
    transport: parseTransportLine(included) ?? 'Private transfers',
    accommodation: buildAccommodation(dto.durationDays),
    departureFrequency: 'Flexible dates',
    reviews,
    faqs: dto.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    policies: dto.policies.map((p) => ({
      kind: p.kind,
      title: p.title,
      body: p.body,
    })),
  };
}

/** Approved reviews for a tour (public, PII-stripped). Empty on error. */
export async function fetchTourReviews(slug: string): Promise<TourReview[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours/{slug}/reviews', {
    params: { path: { slug }, query: { pageSize: 9 } },
    // Tagged so the API can bust this read via `revalidateTag('tour:<slug>')`
    // the moment a review is (un)approved — otherwise it freezes into the ISR
    // output for up to 300s.
    next: { tags: [tourTag(slug)] },
  });
  const list = (data as unknown as { data: PublicReviewDto[] }).data ?? [];
  return list.map(toTourReview);
}

/** Published tour slugs for `generateStaticParams` (empty on error → pages render on-demand). */
export async function fetchTourDetailSlugs(): Promise<string[]> {
  const cards = await fetchTourCards().catch(() => []);
  return cards.map((c) => c.slug);
}

/**
 * Full detail view-model for a tour, or `null` when the slug is unknown/unpublished.
 * Reviews + related are fetched alongside the detail. The single-resource response is
 * enveloped (`{ data }`), so we unwrap `.data` (see admin envelope-unwrap gotcha).
 *
 * Wrapped in React `cache()` so `generateMetadata` and the page body share one fetch per
 * request instead of hitting the API twice for the same slug.
 */
export const fetchTourDetail = cache(
  async (slug: string): Promise<TourDetailVM | null> => {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/tours/{slug}', {
      params: { path: { slug } },
      // Same tag as the reviews read: approving a review also shifts
      // averageRating/reviewsCount on the detail DTO, so both refresh together.
      next: { tags: [tourTag(slug)] },
    });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    if (error || !dto) return null;

    const [reviews, cards] = await Promise.all([
      fetchTourReviews(slug).catch(() => []),
      fetchTourCards().catch(() => []),
    ]);
    return toTourDetail(dto, reviews, pickRelated(cards, slug));
  },
);
