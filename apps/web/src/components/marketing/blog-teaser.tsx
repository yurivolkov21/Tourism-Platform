import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { PostCard } from '../blog/post-card';
import type { PostSummaryVM } from '../../lib/blog/post-vm';

// FIXTURES — placeholder posts (Unsplash covers) still feeding the teaser until slice 2 wires
// `fetchPosts` through `app/page.tsx`. After wiring they remain ONLY as the API-error/empty
// fallback so the home never looks broken. Their slugs resolve to notFound if clicked while
// the fallback is active — acceptable for a degraded state.
const cover = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;

const fixturePosts: PostSummaryVM[] = [
  {
    slug: 'best-time-to-visit-vietnam',
    title: 'The best time to visit Vietnam, region by region',
    excerpt:
      'When the north is misty and the south is golden — how to time your trip for the weather you want.',
    publishedAt: '2026-05-18',
    coverUrl: cover('photo-1555921015-5532091f6026'),
    tags: [],
    author: { fullName: null, avatarUrl: null },
  },
  {
    slug: 'two-unhurried-days-in-hoi-an',
    title: 'Two unhurried days in Hội An',
    excerpt: 'Lanterns, tailors, and riverside mornings — a slow itinerary for the old town.',
    publishedAt: '2026-04-30',
    coverUrl: cover('photo-1583417319070-4a69db38a482'),
    tags: [],
    author: { fullName: null, avatarUrl: null },
  },
  {
    slug: 'morning-at-the-mekong-floating-markets',
    title: 'A morning at the Mekong floating markets',
    excerpt: 'Dawn on the delta: what to expect, what to eat, and how to find the quieter channels.',
    publishedAt: '2026-04-12',
    coverUrl: cover('photo-1528181304800-259b08848526'),
    tags: [],
    author: { fullName: null, avatarUrl: null },
  },
];

/**
 * Home journal teaser. Server page passes real posts (`fetchPosts({ pageSize: 3 })`); on API
 * error/empty the FIXTURES above keep the section alive (home must never look broken — the
 * established home-section pattern). The real `/blog` page does NOT fall back like this.
 */
export function BlogTeaser({ posts }: { posts: PostSummaryVM[] }) {
  const t = messages.blog;
  const items = posts.length > 0 ? posts.slice(0, 3) : fixturePosts;
  const [lead, ...rest] = items;

  return (
    <section id="journal" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
            <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          </div>
          <a
            href="/blog"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'shrink-0 max-sm:hidden')}
          >
            {t.viewAll}
            <ArrowRightIcon />
          </a>
        </div>

        {/* Featured-first: lead post spans two columns / two rows; the rest fill the side column. */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PostCard post={lead} featured />
          {rest.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default BlogTeaser;
