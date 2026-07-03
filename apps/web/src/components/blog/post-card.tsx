import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, CalendarDaysIcon, ImageIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { PostSummaryVM } from '../../lib/blog/post-vm';

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

const cardShell =
  'group bg-card ring-border/60 shadow-card hover:shadow-dropdown hover:ring-primary/40 flex h-full flex-col overflow-hidden rounded-xl ring-1 transition-all duration-200 ease-out-expo hover:-translate-y-0.5';

/**
 * Journal card (shared by the home teaser, `/blog` index, and article footer). `featured` gives
 * the lead-story treatment (spans 2 cols / 2 rows in a 3-col grid). Cover is optional → muted
 * placeholder panel, never a broken image.
 */
export function PostCard({ post, featured = false }: { post: PostSummaryVM; featured?: boolean }) {
  const t = messages.blog;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(cardShell, featured && 'sm:col-span-2 lg:row-span-2')}
    >
      <div
        className={cn(
          'relative overflow-hidden',
          featured ? 'aspect-16/10 lg:aspect-auto lg:min-h-64 lg:flex-1' : 'aspect-16/10',
        )}
      >
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            sizes={featured ? '(min-width: 1024px) 66vw, 100vw' : '(min-width: 1024px) 33vw, 50vw'}
            className="object-cover transition-transform duration-300 ease-out-expo group-hover:scale-105"
          />
        ) : (
          <div className="bg-muted text-muted-foreground/50 flex h-full items-center justify-center">
            <ImageIcon className="size-8" aria-hidden="true" />
          </div>
        )}
        {featured && (
          <span className="bg-primary text-primary-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            {t.featuredLabel}
          </span>
        )}
      </div>
      <div className={cn('flex flex-1 flex-col gap-2 p-5 lg:p-6', featured && 'lg:flex-none')}>
        {post.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {post.tags.slice(0, 2).map((t) => (
              <span
                key={t.slug}
                className="border-border/60 text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium"
              >
                {t.name}
              </span>
            ))}
          </span>
        ) : null}
        {post.publishedAt ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <CalendarDaysIcon className="size-3.5" />
            {dateFmt.format(new Date(post.publishedAt))}
          </span>
        ) : null}
        <h3
          className={cn(
            'group-hover:text-primary font-sans font-semibold text-balance transition-colors',
            featured ? 'text-xl lg:text-2xl' : 'text-lg',
          )}
        >
          {post.title}
        </h3>
        <p
          className={cn(
            'text-muted-foreground text-sm text-pretty',
            featured ? 'line-clamp-3' : 'line-clamp-2',
          )}
        >
          {post.excerpt}
        </p>
        <span className="text-primary mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium">
          {t.readMore}
          <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default PostCard;
