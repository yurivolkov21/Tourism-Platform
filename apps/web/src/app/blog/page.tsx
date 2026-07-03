import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { PostCard } from '../../components/blog/post-card';
import { BreadcrumbJsonLd } from '../../components/seo/json-ld';
import { fetchPosts, type PostsPage } from '../../lib/api/posts';
import { pageNumbers } from '../../lib/paginate';

export const metadata: Metadata = {
  title: messages.blog.indexTitle,
  description: messages.blog.subtitle,
  alternates: { canonical: '/blog' },
};

const PAGE_SIZE = 12;

/** `?page=` → positive int; anything else clamps to 1 (friendlier than a 404). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function pageHref(page: number): string {
  return page <= 1 ? '/blog' : `/blog?page=${page}`;
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const t = messages.blog;

  let result: PostsPage | null = null;
  let failed = false;
  try {
    result = await fetchPosts({ page, pageSize: PAGE_SIZE });
  } catch {
    // Real reader page: NO fixture fallback — show an honest notice below instead.
    failed = true;
  }

  // Past-the-end page (stale link) → clamp back to page 1.
  if (result && page > 1 && result.posts.length === 0 && result.meta.total > 0) redirect('/blog');

  const posts = result?.posts ?? [];
  const meta = result?.meta;
  const showHero = page === 1 && posts.length > 0;
  const [lead, ...rest] = posts;

  return (
    <main>
      <BreadcrumbJsonLd
        items={[
          { name: messages.common.home, path: '/' },
          { name: t.breadcrumb, path: '/blog' },
        ]}
      />

      <section className="py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <h1 className="font-heading text-3xl font-bold text-balance md:text-4xl">
              {t.heading}
            </h1>
            <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          </div>

          <div className="mt-10 sm:mt-14">
            {failed ? (
              <div className="border-border/60 bg-muted/40 text-muted-foreground flex items-start gap-3 rounded-xl border p-6 text-sm">
                <AlertCircleIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p>{t.loadError}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="border-border/60 bg-muted/40 rounded-xl border p-10 text-center">
                <h2 className="font-heading text-xl font-semibold">{t.emptyTitle}</h2>
                <p className="text-muted-foreground mt-2 text-pretty">{t.emptyBody}</p>
              </div>
            ) : (
              <>
                {/* Page 1: magazine hero (newest spans 2 cols / 2 rows). Page 2+: plain grid —
                    the hero means "the latest", not "first of every page". */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {showHero ? (
                    <>
                      <PostCard post={lead} featured />
                      {rest.map((post) => (
                        <PostCard key={post.slug} post={post} />
                      ))}
                    </>
                  ) : (
                    posts.map((post) => <PostCard key={post.slug} post={post} />)
                  )}
                </div>
                {meta && meta.totalPages > 1 ? (
                  <BlogPagination page={meta.page} totalPages={meta.totalPages} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/** URL-driven pagination — real `?page=` hrefs (server-rendered, crawlable), region-page look. */
function BlogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const disabled = 'pointer-events-none opacity-40';
  return (
    <Pagination className="mt-12 w-fit max-sm:mx-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            href={pageHref(page - 1)}
            aria-label="Go to previous page"
            aria-disabled={isFirst || undefined}
            tabIndex={isFirst ? -1 : undefined}
            size="icon"
            className={cn('rounded-full', isFirst && disabled)}
          >
            <ChevronLeftIcon className="size-4" />
          </PaginationLink>
        </PaginationItem>

        {pageNumbers(totalPages, page).map((p, i) =>
          p === 'ellipsis' ? (
            <PaginationItem key={`e${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={pageHref(p)} isActive={p === page} className="rounded-full">
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationLink
            href={pageHref(page + 1)}
            aria-label="Go to next page"
            aria-disabled={isLast || undefined}
            tabIndex={isLast ? -1 : undefined}
            size="icon"
            className={cn('rounded-full', isLast && disabled)}
          >
            <ChevronRightIcon className="size-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
