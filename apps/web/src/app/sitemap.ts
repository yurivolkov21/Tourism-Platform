import type { MetadataRoute } from 'next';

import { absoluteUrl } from '../lib/site';
import { fetchTourDetailSlugs } from '../lib/api/tour-detail';
import { fetchPostSlugs } from '../lib/api/posts';
import { regionSlugs } from '../lib/regions';

// Revalidate the sitemap on the same cadence as the catalogue pages.
export const revalidate = 300;

// Public, indexable static routes (account / auth / checkout are excluded — see robots.ts).
const STATIC_PATHS: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/tours', priority: 0.9, changeFrequency: 'daily' },
  { path: '/destinations', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'daily' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/cancellation-policy', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Tours and posts can be cold-started/unavailable on the free tier — degrade to the static set.
  const [tourSlugs, postSlugs] = await Promise.all([
    fetchTourDetailSlugs().catch(() => [] as string[]),
    fetchPostSlugs().catch(() => [] as string[]),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((r) => ({
    url: absoluteUrl(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const regionEntries: MetadataRoute.Sitemap = regionSlugs().map((slug) => ({
    url: absoluteUrl(`/destinations/${slug}`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const tourEntries: MetadataRoute.Sitemap = tourSlugs.map((slug) => ({
    url: absoluteUrl(`/tours/${slug}`),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...regionEntries, ...tourEntries, ...postEntries];
}
