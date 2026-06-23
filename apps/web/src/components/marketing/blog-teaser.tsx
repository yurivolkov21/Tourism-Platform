import Image from 'next/image';
import { ArrowRightIcon, CalendarDaysIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Shape mirrors the Post API (GET /posts) — slug/title/excerpt/publishedAt + a cover.
// Placeholder fixtures + temporary Unsplash covers for review; wire GET /posts?limit=3
// via @tourism/core later.
type PostTeaser = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  image: string;
};

const cover = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;

const posts: PostTeaser[] = [
  {
    slug: 'best-time-to-visit-vietnam',
    title: 'The best time to visit Vietnam, region by region',
    excerpt:
      'When the north is misty and the south is golden — how to time your trip for the weather you want.',
    publishedAt: '2026-05-18',
    image: cover('photo-1555921015-5532091f6026'),
  },
  {
    slug: 'two-unhurried-days-in-hoi-an',
    title: 'Two unhurried days in Hội An',
    excerpt: 'Lanterns, tailors, and riverside mornings — a slow itinerary for the old town.',
    publishedAt: '2026-04-30',
    image: cover('photo-1583417319070-4a69db38a482'),
  },
  {
    slug: 'morning-at-the-mekong-floating-markets',
    title: 'A morning at the Mekong floating markets',
    excerpt: 'Dawn on the delta: what to expect, what to eat, and how to find the quieter channels.',
    publishedAt: '2026-04-12',
    image: cover('photo-1528181304800-259b08848526'),
  },
];

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

const cardShell =
  'group bg-card ring-border/60 shadow-card hover:shadow-dropdown hover:ring-primary/40 flex h-full flex-col overflow-hidden rounded-xl ring-1 transition-all duration-200 ease-out-expo hover:-translate-y-0.5';

function PostCard({ post, featured = false }: { post: PostTeaser; featured?: boolean }) {
  const t = messages.blog;
  return (
    <a
      href={`#post-${post.slug}`}
      className={cn(cardShell, featured && 'sm:col-span-2 lg:row-span-2')}
    >
      <div
        className={cn(
          'relative overflow-hidden',
          featured ? 'aspect-16/10 lg:aspect-auto lg:min-h-64 lg:flex-1' : 'aspect-16/10',
        )}
      >
        <Image
          src={post.image}
          alt={post.title}
          fill
          sizes={featured ? '(min-width: 1024px) 66vw, 100vw' : '(min-width: 1024px) 33vw, 50vw'}
          className="object-cover transition-transform duration-300 ease-out-expo group-hover:scale-105"
        />
        {featured && (
          <span className="bg-primary text-primary-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            {t.featuredLabel}
          </span>
        )}
      </div>
      <div className={cn('flex flex-1 flex-col gap-2 p-5 lg:p-6', featured && 'lg:flex-none')}>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <CalendarDaysIcon className="size-3.5" />
          {dateFmt.format(new Date(post.publishedAt))}
        </span>
        <h3
          className={cn(
            'group-hover:text-primary font-sans font-semibold text-balance transition-colors',
            featured ? 'text-xl lg:text-2xl' : 'text-lg',
          )}
        >
          {post.title}
        </h3>
        <p className={cn('text-muted-foreground text-sm text-pretty', featured ? 'line-clamp-3' : 'line-clamp-2')}>
          {post.excerpt}
        </p>
        <span className="text-primary mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium">
          {t.readMore}
          <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

export function BlogTeaser() {
  const t = messages.blog;
  const [lead, ...rest] = posts;

  return (
    <section id="journal" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
            <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          </div>
          <a
            href="#journal"
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
