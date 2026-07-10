import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { PostSummaryVM } from '../../lib/blog/post-vm';

function NavCell({
  post,
  direction,
}: {
  post: PostSummaryVM;
  direction: 'older' | 'newer';
}) {
  const t = messages.blog;
  const Arrow = direction === 'older' ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={
        'group border-border/60 hover:border-primary/40 rounded-xl border p-5 transition-colors' +
        (direction === 'newer' ? ' text-right' : '')
      }
    >
      <span
        className={
          'text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase' +
          (direction === 'newer' ? ' flex-row-reverse' : '')
        }
      >
        <Arrow className="size-3.5" aria-hidden="true" />
        {direction === 'older' ? t.olderStory : t.newerStory}
      </span>
      <span className="font-heading group-hover:text-primary mt-2 line-clamp-2 block font-semibold transition-colors">
        {post.title}
      </span>
    </Link>
  );
}

/**
 * Chronological prev/next navigation at the article's end. Older on the left, newer on
 * the right; a missing side keeps its slot (so "newer" stays right-aligned) on desktop.
 */
export function PostNav({
  newer,
  older,
}: {
  newer: PostSummaryVM | null;
  older: PostSummaryVM | null;
}) {
  if (!newer && !older) return null;
  return (
    <nav
      aria-label={messages.blog.postNavLabel}
      className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2 lg:max-w-5xl"
    >
      {older ? (
        <NavCell post={older} direction="older" />
      ) : (
        <div aria-hidden className="hidden sm:block" />
      )}
      {newer ? <NavCell post={newer} direction="newer" /> : null}
    </nav>
  );
}

export default PostNav;
