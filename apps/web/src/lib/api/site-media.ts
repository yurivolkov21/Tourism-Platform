// Managed brand-chrome media for the marketing chrome (home hero, About story, …).
// Plain fetch + ISR like the other public marketing reads; errors degrade to an
// empty map so every slot falls back to its built-in default.

import { cache } from 'react';

import { TAGS } from '../revalidate';
import type { SiteMediaImage, SiteMediaMap } from '../site-media';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

interface SiteMediaSlotDto {
  key: string;
  media: Array<SiteMediaImage & { publicId?: string }>;
}

/**
 * Slot key → managed images (`GET /site-media`, ISR 5 min). `{}` on any failure.
 * `cache()` dedupes the fetch across the components of one render pass.
 */
export const getSiteMedia = cache(async (): Promise<SiteMediaMap> => {
  try {
    const res = await fetch(`${API_BASE}/api/v1/site-media`, {
      // Tagged: the API busts `site-media` when an Appearance slot changes.
      next: { revalidate: 300, tags: [TAGS.SITE_MEDIA] },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: SiteMediaSlotDto[] };
    if (!Array.isArray(json.data)) return {};
    const map: SiteMediaMap = {};
    for (const slot of json.data) {
      if (slot?.key && Array.isArray(slot.media)) map[slot.key] = slot.media;
    }
    return map;
  } catch {
    return {};
  }
});
