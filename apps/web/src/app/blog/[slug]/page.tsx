import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, ClockIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { PostCard } from '../../../components/blog/post-card';
import { PostContent } from '../../../components/blog/post-content';
import { ArticleJsonLd, BreadcrumbJsonLd } from '../../../components/seo/json-ld';
import { fetchPost, fetchPosts, fetchPostSlugs } from '../../../lib/api/posts';
import { extractOutline, readingStats } from '../../../lib/blog/derive';

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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  const t = messages.blog;
  const outline = extractOutline(post.content);
  const { minutes } = readingStats(post.content);
  // 3 newest OTHER posts (fetch 4 → drop self if present). Degrades to none on API error.
  const more = await fetchPosts({ pageSize: 4 })
    .then((page) => page.posts.filter((p) => p.slug !== slug).slice(0, 3))
    .catch(() => []);

  return (
    <main>
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        image={post.coverUrl ?? undefined}
        slug={slug}
        datePublished={post.publishedAt ?? undefined}
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
            <span className="text-foreground font-medium">{t.byline(messages.brand.name)}</span>
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
          </div>
        </header>

        {/* Body + outline rail: rail is sticky on desktop, a plain list ABOVE the body on mobile. */}
        <div className="mx-auto mt-10 grid max-w-3xl gap-10 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_14rem]">
          <PostContent content={post.content} />

          {outline.length >= 2 ? (
            <aside className="max-lg:order-first">
              <nav aria-label={t.outlineHeading} className="lg:sticky lg:top-28">
                <h2 className="font-sans text-sm font-semibold tracking-wide uppercase">
                  {t.outlineHeading}
                </h2>
                <ul className="border-border/60 mt-3 space-y-2 border-l pl-4 text-sm">
                  {outline.map((item, i) => (
                    <li key={`${item.id}-${i}`} className={item.depth === 3 ? 'pl-3' : undefined}>
                      <a
                        href={`#${item.id}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          ) : null}
        </div>
      </article>

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
    </main>
  );
}
