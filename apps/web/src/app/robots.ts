import type { MetadataRoute } from 'next';

import { absoluteUrl, SITE_URL } from '../lib/site';

/**
 * Allow indexing of public marketing/catalogue pages; keep private + transactional surfaces out of
 * search results. The sitemap points crawlers at the canonical URL set.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/checkout', '/login', '/register', '/forgot-password', '/reset-password', '/api/', '/ui-check'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
