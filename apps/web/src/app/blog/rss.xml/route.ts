import { messages } from '@tourism/i18n';

import { fetchPosts } from '../../../lib/api/posts';
import { buildRssXml } from '../../../lib/blog/rss';
import { absoluteUrl } from '../../../lib/site';

// Same ISR cadence as the sitemap/catalogue pages — the free API tier isn't hit per request.
export const revalidate = 300;

/** RSS 2.0 feed of the journal — newest 50 published posts, excerpt-level items. */
export async function GET(): Promise<Response> {
  const page = await fetchPosts({ pageSize: 50 }).catch(() => null);

  const xml = buildRssXml(
    {
      title: `${messages.brand.name} — ${messages.blog.indexTitle}`,
      link: absoluteUrl('/blog'),
      description: messages.blog.subtitle,
    },
    (page?.posts ?? []).map((p) => ({
      title: p.title,
      link: absoluteUrl(`/blog/${p.slug}`),
      description: p.excerpt,
      pubDate: p.publishedAt ?? undefined,
    })),
  );

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
