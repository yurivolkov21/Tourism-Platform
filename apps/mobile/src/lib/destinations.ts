import type { components } from '@tourism/core';
import { getApiClient } from './api';

type DestinationDto = components['schemas']['DestinationDto'];

export interface DestinationChipVm {
  slug: string;
  name: string;
  image?: string;
  toursCount: number;
}

export function toDestinationChipVm(dto: DestinationDto): DestinationChipVm {
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
    slug: dto.slug,
    name: dto.name,
    image: hero?.url,
    toursCount: dto.toursCount ?? 0,
  };
}

/** Active destinations for the Explore chips rail (same query shape web's overview uses). */
export async function fetchDestinations(): Promise<DestinationChipVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/destinations', {
    params: { query: { pageSize: 100 } },
  });
  const list = (data as unknown as { data: DestinationDto[] }).data ?? [];
  return list.map(toDestinationChipVm);
}
