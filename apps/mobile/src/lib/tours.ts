import type { components } from '@tourism/core';
import { getApiClient } from './api';

export type TourSummaryDto = components['schemas']['TourSummaryDto'];

export interface TourCardVm {
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  currency: string;
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
    price: Number(dto.basePrice),
    currency: dto.currency,
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
