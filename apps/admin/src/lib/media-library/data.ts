import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type AdminMediaAsset = components['schemas']['AdminMediaAssetDto'];
export type MediaGarbageRow = components['schemas']['MediaGarbageRowDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface MediaListParams {
  page?: number;
  pageSize?: number;
  ownerType?: string;
  role?: string;
  type?: string;
  search?: string;
}

export interface MediaList {
  data: AdminMediaAsset[];
  meta: PageMeta;
}

export interface GarbageListParams {
  page?: number;
  pageSize?: number;
}

export interface GarbageList {
  data: MediaGarbageRow[];
  meta: PageMeta;
}

/** Lists media assets (`GET /admin/media`) — server-side filters + pagination. */
export async function listMedia(params: MediaListParams = {}): Promise<MediaList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/media', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        ownerType: params.ownerType as "TOUR" | "DESTINATION" | "USER" | "POST" | undefined,
        role: params.role as "hero" | "gallery" | "avatar" | undefined,
        type: params.type as "IMAGE" | "VIDEO" | undefined,
        search: params.search,
      },
    },
  });
  return data as unknown as MediaList;
}

/** Lists the deferred Cloudinary-destroy queue (`GET /api/v1/admin/media/garbage`). */
export async function listGarbage(params: GarbageListParams = {}): Promise<GarbageList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/media/garbage', {
    params: { query: { page: params.page, pageSize: params.pageSize } },
  });
  return data as unknown as GarbageList;
}
