import { cache } from 'react';

import {
  mapPublicReview,
  pickRelated,
  toTourDetail,
  type components,
} from '@tourism/core';

import type { TourBadgeKey, TourCardData } from '../../components/tours/tour-card';
import type { TourDetailVM, TourReview } from '../tours';
import { buildAccommodation, parseMealsLine, parseTransportLine } from '../tour-detail-derive';
import { getApiClient } from './client';
import { fetchTourCards } from './tours';

type TourDetailDto = components['schemas']['TourDetailDto'];
type PublicReviewDto = components['schemas']['PublicReviewDto'];

/** Hero status chip for web — maps merchandising badges to legacy VM chip. */
function deriveWebBadge(badges: readonly string[]): TourDetailVM['badge'] {
  return badges.includes('POPULAR') || badges.includes('BEST_VALUE')
    ? 'bestSeller'
    : undefined;
}

function toTourReview(dto: PublicReviewDto): TourReview {
  return mapPublicReview(dto);
}

/** Maps core detail data into the web view-model (card-compatible + web-only fields). */
function toTourDetailVM(
  dto: TourDetailDto,
  reviews: TourReview[],
  related: TourCardData[],
): TourDetailVM {
  const data = toTourDetail(
    dto,
    reviews.map((r) => r),
  );
  const included = dto.included ?? [];

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    destination: data.destination,
    durationDays: data.durationDays,
    basePrice: data.basePrice,
    compareAtPrice: data.compareAtPrice,
    currency: data.currency,
    rating: data.rating,
    reviewCount: data.reviewCount,
    badges: (dto.badges ?? []) as TourBadgeKey[],
    image: data.heroImage,
    summary: data.overview || undefined,
    destinationSlug: data.destinationSlug,
    region: '',
    overview: data.overview,
    gallery: data.gallery,
    itinerary: data.itinerary,
    included: data.included,
    notIncluded: data.notIncluded,
    departures: [],
    badge: deriveWebBadge(dto.badges ?? []),
    related,
    meals: data.meals ?? parseMealsLine(included) ?? 'Meals as listed',
    transport: data.transport ?? parseTransportLine(included) ?? 'Private transfers',
    accommodation: data.accommodation ?? buildAccommodation(data.durationDays) ?? 'Hotel',
    departureFrequency: 'Flexible dates',
    reviews: data.reviews,
    faqs: data.faqs,
    policies: data.policies,
  };
}

/** Approved reviews for a tour (public, PII-stripped). Empty on error. */
export async function fetchTourReviews(slug: string): Promise<TourReview[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours/{slug}/reviews', {
    params: { path: { slug }, query: { pageSize: 9 } },
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
    });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    if (error || !dto) return null;

    const [reviews, cards] = await Promise.all([
      fetchTourReviews(slug).catch(() => []),
      fetchTourCards().catch(() => []),
    ]);
    return toTourDetailVM(dto, reviews, pickRelated(cards, slug));
  },
);

export type { TourDetailData } from '@tourism/core';
