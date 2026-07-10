import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  RefreshCwIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';
import { ScrollProgress } from '@tourism/ui';

import { TourCard } from '../../../components/tours/tour-card';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { PostCard } from '../../../components/blog/post-card';
import { PostContent } from '../../../components/blog/post-content';
import { OutlineRail } from '../../../components/blog/outline-rail';
import { PostNav } from '../../../components/blog/post-nav';
import { ShareRow } from '../../../components/blog/share-row';
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
} from '../../../components/seo/json-ld';
import { fetchPost, fetchPosts, fetchPostSlugs } from '../../../lib/api/posts';
import { pickAdjacentPosts } from '../../../lib/blog/adjacent';
import {
  extractOutline,
  isMeaningfullyUpdated,
  readingStats,
} from '../../../lib/blog/derive';
import { pickMorePosts } from '../../../lib/blog/pick-more-posts';
import { absoluteUrl } from '../../../lib/site';

// ISR: render articles statically; revalidate so the free API tier isn't hit per request.
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await fetchPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: `/blog/${slug}`,
      ...(post.coverUrl ? { images: [{ url: post.coverUrl }] } : {}),
    },
  };
}

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  const t = messages.blog;
  const outline = extractOutline(post.content);
  const { minutes } = readingStats(post.content);
  // Same-topic posts first (primary tag), recency top-up; all error-tolerant. The wide
  // page feeds prev/next (same 100-post window generateStaticParams uses).
  const [taggedPage, recentPage, widePage] = await Promise.all([
    post.tags.length > 0
      ? fetchPosts({ tag: post.tags[0].slug, pageSize: 4 }).catch(() => null)
      : Promise.resolve(null),
    fetchPosts({ pageSize: 6 }).catch(() => null),
    fetchPosts({ pageSize: 100 }).catch(() => null),
  ]);
  const more = pickMorePosts(
    taggedPage?.posts ?? [],
    recentPage?.posts ?? [],
    slug,
  );
  const { newer, older } = pickAdjacentPosts(widePage?.posts ?? [], slug);
  const showUpdated = isMeaningfullyUpdated(post.publishedAt, post.updatedAt);

  return (
    <main>
      <ScrollProgress />
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        image={post.coverUrl ?? undefined}
        slug={slug}
        datePublished={post.publishedAt ?? undefined}
        authorName={post.author.fullName ?? undefined}
      />
      <BreadcrumbJsonLd
        items={[
          { name: messages.common.home, path: '/' },
          { name: t.breadcrumb, path: '/blog' },
          { name: post.title, path: `/blog/${slug}` },
        ]}
      />

      {/* Cover hero — only when the post has one (no broken/placeholder hero). */}
      {post.coverUrl ? (
        <section className="relative isolate min-h-72 overflow-hidden lg:min-h-96">
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="from-overlay/70 via-overlay/25 absolute inset-0 -z-10 bg-linear-to-t to-transparent" />
        </section>
      ) : null}

      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="mx-auto max-w-3xl lg:max-w-5xl">
          <Link
            href="/blog"
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            {t.backToBlog}
          </Link>
          <h1 className="font-heading mt-4 max-w-3xl text-3xl font-bold text-balance sm:text-4xl">
            {post.title}
          </h1>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <span className="inline-flex items-center gap-2">
              {post.author.avatarUrl ? (
                <Image
                  src={post.author.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded-full object-cover"
                />
              ) : null}
              <span className="text-foreground font-medium">
                {post.author.fullName
                  ? t.bylineNamed(post.author.fullName)
                  : t.byline(messages.brand.name)}
              </span>
            </span>
            {post.publishedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDaysIcon className="size-4" aria-hidden="true" />
                {dateFmt.format(new Date(post.publishedAt))}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-4" aria-hidden="true" />
              {t.minRead(minutes)}
            </span>
            {showUpdated && post.updatedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCwIcon className="size-4" aria-hidden="true" />
                {t.updatedOn(dateFmt.format(new Date(post.updatedAt)))}
              </span>
            ) : null}
          </div>
          {post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tg) => (
                <Link
                  key={tg.slug}
                  href={`/blog?tag=${encodeURIComponent(tg.slug)}`}
                  className="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
                >
                  {tg.name}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        {/* Body + outline rail: rail is sticky on desktop, a plain list ABOVE the body on mobile. */}
        <div className="mx-auto mt-10 grid max-w-3xl gap-10 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="min-w-0">
            <PostContent content={post.content} />
            <ShareRow url={absoluteUrl(`/blog/${slug}`)} title={post.title} />
          </div>

          {outline.length >= 2 ? (
            <OutlineRail items={outline} heading={t.outlineHeading} />
          ) : null}
        </div>

        <PostNav newer={newer} older={older} />
      </article>

      {post.relatedTours.length > 0 ? (
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading mb-8 text-2xl font-semibold text-balance md:text-3xl">
              {t.toursHeading}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {post.relatedTours.map((tour) => (
                <TourCard key={tour.slug} tour={tour} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {more.length > 0 ? (
        <section className="bg-muted/40 py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">
                {t.moreHeading}
              </h2>
              <Link
                href="/blog"
                className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
              >
                {t.viewAll}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <EnquiryCta
        heading={messages.enquiryCta.headings.blog(post.title)}
        prefillDestination={post.relatedTours[0]?.title ?? post.title}
      />
    </main>
  );
}
