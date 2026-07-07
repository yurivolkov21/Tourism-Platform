import type { components } from '@tourism/core';
import { getApiClient } from './api';

export type TourSummaryDto = components['schemas']['TourSummaryDto'];
export type TourBadge = TourSummaryDto['badges'][number];

/** Structurally satisfies `@tourism/core`'s `FilterableTour` + `SearchableTour`. */
export interface TourCardVm {
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  badges: TourBadge[];
  nextDepartureSeatsLeft?: number;
  category?: string;
  categoryName?: string;
  image?: string;
}

export function toTourCardVm(dto: TourSummaryDto): TourCardVm {
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
    badges: dto.badges ?? [],
    nextDepartureSeatsLeft: dto.nextDepartureSeatsLeft ?? undefined,
    category: dto.category?.slug,
    categoryName: dto.category?.name,
    image: hero?.url,
  };
}

/** Featured tours for the Home shelf — same query shape the web home uses. */
export async function fetchFeaturedTours(): Promise<TourCardVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours', {
    params: { query: { featured: true, pageSize: 8 } },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return list.map(toTourCardVm);
}

/** Every published tour, one page (client-side filtering strategy — W2 spec decision #2). */
export async function fetchAllTours(): Promise<TourCardVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours', {
    params: { query: { pageSize: 100 } },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return list.map(toTourCardVm);
}
