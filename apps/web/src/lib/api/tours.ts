import type { components } from '@tourism/core';
import { messages } from '@tourism/i18n';

import type {
  TourBadgeKey,
  TourCardData,
  TravellerTypeKey,
} from '../../components/tours/tour-card';
import { TAGS } from '../revalidate';
import { getApiClient } from './client';

type TourSummaryDto = components['schemas']['TourSummaryDto'];

const KNOWN_TRAVELLER_TYPES = new Set(Object.keys(messages.travellerTypes));

/** Drops traveller types a newer API might add before the FE regen — an unknown key would otherwise render as the literal text "undefined". */
export function knownTravellerTypes(
  values: string[] | undefined,
): TravellerTypeKey[] {
  return (values ?? []).filter((v): v is TravellerTypeKey =>
    KNOWN_TRAVELLER_TYPES.has(v),
  );
}

/** Adapts an API tour summary → the card view-model the UI renders. */
export function toTourCard(dto: TourSummaryDto): TourCardData {
  const primary =
    dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
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
    imageAlt: hero?.alt,
    summary: dto.summary ?? undefined,
    category: dto.category?.slug,
    categoryName: dto.category?.name,
    nextDepartureDate: dto.nextDepartureDate,
    nextDepartureSeatsLeft: dto.nextDepartureSeatsLeft,
    suitableFor: knownTravellerTypes(dto.suitableFor),
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
    params: {
      query: { pageSize: params.pageSize ?? 100, featured: params.featured },
    },
    // Tagged: the API busts `tours` on any tour create/update/(un)publish/delete.
    next: { tags: [TAGS.TOURS] },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return list.map(toTourCard);
}
