import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';

import {
  Button,
  Input,
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
import { fetchPosts, fetchPostTags } from '../../lib/api/posts';
import { pageNumbers } from '../../lib/paginate';

export const metadata: Metadata = {
  title: messages.blog.indexTitle,
  description: messages.blog.subtitle,
  alternates: {
    canonical: '/blog',
    types: { 'application/rss+xml': '/blog/rss.xml' },
  },
};

const PAGE_SIZE = 12;

/** `?page=` → positive int; anything else clamps to 1 (friendlier than a 404). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** `/blog` URL preserving the active tag + search (BE ANDs them) and an optional page. */
function blogHref(tag?: string, q?: string, page?: number): string {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (q) params.set('q', q);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : '/blog';
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  // Clamp to the BE caps (tag slug 60, search 160) so a hand-mangled URL can't 400 the page.
  const tag = sp.tag?.trim().slice(0, 60) || undefined;
  const q = sp.q?.trim().slice(0, 160) || undefined;
  const filtered = Boolean(tag || q);
  const t = messages.blog;

  const [tagOptions, listResult] = await Promise.all([
    fetchPostTags().catch(() => []),
    fetchPosts({ page, pageSize: PAGE_SIZE, tag, search: q })
      .then((r) => ({ ok: true as const, r }))
      .catch(() => ({ ok: false as const })),
  ]);
  const result = listResult.ok ? listResult.r : null;
  const failed = !listResult.ok;

  // Past-the-end page (stale link) → clamp back to page 1.
  if (result && page > 1 && result.posts.length === 0 && result.meta.total > 0) redirect(blogHref(tag, q));

  const posts = result?.posts ?? [];
  const meta = result?.meta;
  const showHero = page === 1 && !filtered && posts.length > 0;
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

          {/* Search stays available even on a tag-less blog; only the chip row is conditional. */}
          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {tagOptions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2" aria-label={t.topicsLabel}>
                <TagChip href={blogHref(undefined, q)} active={!tag}>
                  {t.allTag}
                </TagChip>
                {tagOptions.map((tg) => (
                  <TagChip key={tg.slug} href={blogHref(tg.slug, q)} active={tag === tg.slug}>
                    {tg.name}
                  </TagChip>
                ))}
              </div>
            ) : (
              <span />
            )}
            <form action="/blog" className="flex w-full items-center gap-2 lg:max-w-xs">
              {tag ? <input type="hidden" name="tag" value={tag} /> : null}
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchLabel}
              />
              <Button type="submit" variant="outline" size="icon" aria-label={t.searchLabel}>
                <SearchIcon className="size-4" />
              </Button>
            </form>
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
                <p className="text-muted-foreground mt-2 text-pretty">
                  {filtered ? t.emptyFilteredBody : t.emptyBody}
                </p>
                {filtered ? (
                  <Link
                    href="/blog"
                    className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
                  >
                    {t.clearFilters}
                  </Link>
                ) : null}
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
                  <BlogPagination page={meta.page} totalPages={meta.totalPages} tag={tag} q={q} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/** Filter chip link (matches the region-page chip look). */
function TagChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active || undefined}
      className={cn(
        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30',
      )}
    >
      {children}
    </Link>
  );
}

/** URL-driven pagination — real `?page=` hrefs (server-rendered, crawlable), region-page look. */
function BlogPagination({
  page,
  totalPages,
  tag,
  q,
}: {
  page: number;
  totalPages: number;
  tag?: string;
  q?: string;
}) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const disabled = 'pointer-events-none opacity-40';
  return (
    <Pagination className="mt-12 w-fit max-sm:mx-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            href={blogHref(tag, q, page - 1)}
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
              <PaginationLink href={blogHref(tag, q, p)} isActive={p === page} className="rounded-full">
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationLink
            href={blogHref(tag, q, page + 1)}
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
