/**
 * Pure helpers over the managed brand-chrome map (`GET /site-media` via
 * `lib/api/site-media.ts`). Every consumer keeps its built-in default: a slot the
 * admin hasn't (or has reset) simply falls back, so the page can never break.
 */

export interface SiteMediaImage {
  url: string;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
}

/** Slot key → managed images (absent/empty key = use the built-in default). */
export type SiteMediaMap = Partial<Record<string, SiteMediaImage[]>>;

/** The slot's managed image URL, or the component's built-in default. */
export function siteImage(
  map: SiteMediaMap,
  key: string,
  fallback: string,
): string {
  return map[key]?.[0]?.url ?? fallback;
}

/**
 * All-real-or-fixture gallery (the region-imagery rule): a non-empty managed set
 * wins outright; otherwise the FULL fixture list renders — never a mix.
 */
export function siteGallery(
  map: SiteMediaMap,
  key: string,
  fallbacks: string[],
): string[] {
  const managed = map[key];
  if (managed && managed.length > 0) return managed.map((m) => m.url);
  return fallbacks;
}
