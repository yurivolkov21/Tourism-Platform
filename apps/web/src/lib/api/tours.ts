import type { components } from '@tourism/core';

import type { TourBadgeKey, TourCardData } from '../../components/tours/tour-card';
import { getApiClient } from './client';

type TourSummaryDto = components['schemas']['TourSummaryDto'];

/** Adapts an API tour summary → the card view-model the UI renders. */
export function toTourCard(dto: TourSummaryDto): TourCardData {
  const primary = dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
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
    summary: dto.summary ?? undefined,
  };
}

/**
 * Fetches published tours as card view-models (for `/tours` + featured shelves). The list endpoint
 * returns the `{ data, meta }` envelope; we read `.data`. Travel-style/theme facet tags aren't
 * modelled server-side, so they're left undefined (those facets are omitted on the wired page).
 */
export async function fetchTourCards(
  params: { pageSize?: number; featured?: boolean } = {},
): Promise<TourCardData[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours', {
    params: { query: { pageSize: params.pageSize ?? 100, featured: params.featured } },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return list.map(toTourCard);
}
