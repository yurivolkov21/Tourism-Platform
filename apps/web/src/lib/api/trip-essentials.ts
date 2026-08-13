import { cache } from 'react';

import type { components } from '@tourism/core';

import { tourTag } from '../revalidate';
import { getApiClient } from './client';

type TourDetailDto = components['schemas']['TourDetailDto'];

/** Lean per-tour data for the checkout-success page — image + highlights + inclusions
 * + meeting point. Deliberately NOT the full `TourDetailVM` (no reviews/related/itinerary
 * days): this page doesn't render any of that, so `fetchTourDetail` would waste two extra
 * API calls. */
export interface TripEssentials {
  image?: string;
  imageAlt?: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  meetingPoint: string | null;
}

export function toTripEssentials(dto: TourDetailDto): TripEssentials {
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
    image: hero?.url,
    imageAlt: hero?.alt ?? undefined,
    highlights: dto.highlights ?? [],
    included: dto.included ?? [],
    excluded: dto.excluded ?? [],
    meetingPoint: dto.meetingPoint,
  };
}

/** Trip essentials for the tour behind a booking, or `null` on any lookup failure — the
 * checkout-success page must still confirm the booking even if this fetch fails. */
export const fetchTripEssentials = cache(
  async (slug: string): Promise<TripEssentials | null> => {
    const api = getApiClient();
    const { data, error } = await api.GET('/api/v1/tours/{slug}', {
      params: { path: { slug } },
      next: { tags: [tourTag(slug)] },
    });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    if (error || !dto) return null;
    return toTripEssentials(dto);
  },
);
