# Web Blog Reader (P6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public blog reader for `@tourism/web` — `/blog` magazine index + `/blog/[slug]`
markdown article (reading time · outline rail · more-posts footer) + home `BlogTeaser` wired to
real posts + nav/footer/sitemap/SEO. Zero BE change.

**Architecture:** Two slices on two branches. Slice 1 (`feat/web-blog-reader`): pure derive
logic (TDD port from admin), post view-model mapper (TDD), typed fetchers, shared `PostCard`
extraction, and the `/blog/[slug]` article page with full SEO. Slice 2 (`feat/web-blog-index`):
the `/blog` index with URL-driven pagination, home teaser wiring with fixture fallback, nav +
footer links, sitemap entries.

**Tech Stack:** Next.js 16 App Router (Server Components, ISR) · `@tourism/core` typed OpenAPI
client · `react-markdown` + `remark-gfm` (already in web; NO `rehype-raw`) · `@tourism/ui`
(Pagination primitives) · `@tourism/i18n` (all copy) · Jest (`apps/web/jest.config.cts`).

**Spec:** `docs/06-specs/2026-07-03-web-blog-reader-design.md` (approved). Source-of-truth
facts verified 2026-07-03: public `PostDto` has **no author** (byline = brand team);
`GET /posts` maps 1:1 (`{data, meta}`); `GET /posts/:slug` is enveloped (unwrap `.data`);
`pageSize` max 100; `res.cloudinary.com` already in `next.config.js` remotePatterns.

## Global Constraints

- **Tokens only, no hex** (`pnpm check:no-hex` is part of lint); reuse `@tourism/ui` first.
- **All user-facing copy in `@tourism/i18n`** (`libs/shared/i18n/src/lib/messages.ts`), EN-only.
- **App imports are relative** (`../../lib/...`), never `@/`.
- **Straight quotes in code** — never typographic quotes (haiku transcription gotcha).
- **No `rehype-raw`** — markdown must not render raw HTML (XSS).
- **Never stage unrelated dirty files** (`docs/07-plans/2026-07-02-*.md`, `playground.md`).
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`.
  Baselines: web 136 tests / api 291 / admin 134 (verify web count at Task 1; api + admin untouched).
- Commits: Conventional Commits, no AI attribution.
- Next.js 16 is post-training — if any routing/RSC behavior seems off, check live docs before
  improvising.

---

## Slice 1 — foundation + article page (branch `feat/web-blog-reader`)

### Task 1: Port blog derive logic (reading stats · outline · heading slugify) — TDD

**Files:**
- Create: `apps/web/src/lib/blog/derive.ts`
- Test: `apps/web/src/lib/blog/derive.spec.ts`

**Interfaces:**
- Consumes: nothing (pure module; ported from `apps/admin/src/lib/posts/derive.ts`).
- Produces: `readingStats(content: string): { words: number; minutes: number }` ·
  `slugifyHeading(text: string): string` ·
  `extractOutline(content: string): { depth: 2 | 3; text: string; id: string }[]` (`OutlineItem`
  gains `id` vs the admin original — the anchor id, same slugify as rendered headings).

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull && git checkout -b feat/web-blog-reader
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/lib/blog/derive.spec.ts`:

```ts
import { extractOutline, readingStats, slugifyHeading } from './derive';

describe('readingStats', () => {
  it('counts words and computes minutes at ~200 wpm', () => {
    const content = Array.from({ length: 400 }, () => 'word').join(' ');
    expect(readingStats(content)).toEqual({ words: 400, minutes: 2 });
  });

  it('ignores code fences and markdown syntax', () => {
    const { words } = readingStats(
      '## Title\n\n```js\nconst a = 1;\n```\n\n**bold** [link](https://example.com)',
    );
    expect(words).toBe(3); // Title, bold, link
  });

  it('returns zeros for empty content', () => {
    expect(readingStats('')).toEqual({ words: 0, minutes: 0 });
  });

  it('floors short posts at one minute', () => {
    expect(readingStats('just a few words here').minutes).toBe(1);
  });
});

describe('slugifyHeading', () => {
  it('lowercases and hyphenates punctuation runs', () => {
    expect(slugifyHeading('Getting There & Away')).toBe('getting-there-away');
  });

  it('strips Vietnamese diacritics to stable ASCII ids', () => {
    expect(slugifyHeading('Một buổi sáng ở Hội An')).toBe('mot-buoi-sang-o-hoi-an');
  });

  it('trims leading/trailing separators', () => {
    expect(slugifyHeading('  ...Ready?  ')).toBe('ready');
  });
});

describe('extractOutline', () => {
  it('collects h1-h3 headings with anchor ids, normalizing h1 to depth 2', () => {
    expect(extractOutline('# Top\n\ntext\n\n## Section\n\n### Sub')).toEqual([
      { depth: 2, text: 'Top', id: 'top' },
      { depth: 2, text: 'Section', id: 'section' },
      { depth: 3, text: 'Sub', id: 'sub' },
    ]);
  });

  it('skips headings inside code fences and ignores h4+', () => {
    expect(extractOutline('```\n# not a heading\n```\n\n## Real\n\n#### Too deep')).toEqual([
      { depth: 2, text: 'Real', id: 'real' },
    ]);
  });

  it('returns empty for heading-less content', () => {
    expect(extractOutline('plain paragraph')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm nx test @tourism/web --testPathPatterns=lib/blog/derive`
Expected: FAIL — `Cannot find module './derive'`.

- [ ] **Step 4: Write the implementation**

Create `apps/web/src/lib/blog/derive.ts`:

```ts
/**
 * Derived, display-only facts computed from a post's Markdown `content`. Pure — no fetches;
 * ported from the admin post rail (`apps/admin/src/lib/posts/derive.ts`) with heading anchor
 * ids added so the reader page's outline links land on the rendered headings.
 */

const WORDS_PER_MINUTE = 200;
const MAX_OUTLINE = 12;

export interface ReadingStats {
  words: number;
  minutes: number;
}

/** Word count + reading minutes (~200 wpm, floored at 1 for any non-empty post). */
export function readingStats(content: string): ReadingStats {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/[#>*_~`|-]+/g, ' '); // markdown syntax chars
  const words = plain.split(/\s+/).filter(Boolean).length;
  const minutes = words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { words, minutes };
}

/**
 * Anchor id for a heading — the SINGLE slugify shared by the outline links and the rendered
 * headings' `id`s (one source, or anchors silently miss). Diacritics are stripped so
 * Vietnamese headings produce stable ASCII ids.
 */
export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface OutlineItem {
  depth: 2 | 3;
  text: string;
  /** Anchor id — matches the rendered heading's `id` (same slugify). */
  id: string;
}

/** `#`/`##`/`###` headings outside code fences (`#` normalizes to depth 2). Caps at 12 items. */
export function extractOutline(content: string): OutlineItem[] {
  const noFences = content.replace(/```[\s\S]*?```/g, '');
  const out: OutlineItem[] = [];
  for (const line of noFences.split('\n')) {
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line.trim());
    if (!m) continue;
    const text = m[2].trim();
    out.push({ depth: m[1].length >= 3 ? 3 : 2, text, id: slugifyHeading(text) });
    if (out.length >= MAX_OUTLINE) break;
  }
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm nx test @tourism/web --testPathPatterns=lib/blog/derive`
Expected: PASS (10 tests). Also note the full-suite count for the baseline:
`pnpm nx test @tourism/web` should now be 136 + 10 = 146 (if the pre-existing count differs
from 136, record the actual number in the commit body and carry on).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/blog/derive.ts apps/web/src/lib/blog/derive.spec.ts
git commit -m "feat(web): blog derive helpers - reading stats, outline, heading slugify"
```

### Task 2: Post view-model mapper — TDD

**Files:**
- Create: `apps/web/src/lib/blog/post-vm.ts`
- Test: `apps/web/src/lib/blog/post-vm.spec.ts`

**Interfaces:**
- Consumes: `components['schemas']['PostDto']` from `@tourism/core`.
- Produces: `PostSummaryVM { slug: string; title: string; excerpt: string; publishedAt: string | null; coverUrl: string | null }` ·
  `PostDetailVM extends PostSummaryVM { content: string }` ·
  `toPostSummary(dto: PostDto): PostSummaryVM` · `toPostDetail(dto: PostDto): PostDetailVM` ·
  `fallbackExcerpt(content: string): string`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/blog/post-vm.spec.ts`:

```ts
import type { components } from '@tourism/core';

import { fallbackExcerpt, toPostDetail, toPostSummary } from './post-vm';

type PostDto = components['schemas']['PostDto'];
type MediaItemDto = components['schemas']['MediaItemDto'];

const media = (role: MediaItemDto['role'], url: string): MediaItemDto => ({
  publicId: `tourism/posts/${url}`,
  url,
  type: 'IMAGE',
  role,
});

const base: PostDto = {
  id: 'p1',
  slug: 'hoi-an',
  title: 'Two unhurried days in Hoi An',
  excerpt: 'Lanterns and tailors.',
  content: '## Day 1\n\nRiverside mornings.',
  status: 'PUBLISHED',
  publishedAt: '2026-06-01T00:00:00.000Z',
  authorId: 'u1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
  media: [],
};

describe('toPostSummary', () => {
  it('picks the hero-role cover over other roles', () => {
    const vm = toPostSummary({ ...base, media: [media('gallery', 'g.jpg'), media('hero', 'h.jpg')] });
    expect(vm.coverUrl).toBe('h.jpg');
  });

  it('falls back to the first attachment, then null', () => {
    expect(toPostSummary({ ...base, media: [media('gallery', 'g.jpg')] }).coverUrl).toBe('g.jpg');
    expect(toPostSummary(base).coverUrl).toBeNull();
  });

  it('uses the stored excerpt when present', () => {
    expect(toPostSummary(base).excerpt).toBe('Lanterns and tailors.');
  });

  it('derives a plain-text excerpt when the stored one is missing or blank', () => {
    expect(toPostSummary({ ...base, excerpt: null }).excerpt).toBe('Day 1 Riverside mornings.');
    expect(toPostSummary({ ...base, excerpt: '   ' }).excerpt).toBe('Day 1 Riverside mornings.');
  });

  it('passes publishedAt through (null stays null)', () => {
    expect(toPostSummary(base).publishedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(toPostSummary({ ...base, publishedAt: null }).publishedAt).toBeNull();
  });
});

describe('toPostDetail', () => {
  it('adds the markdown content to the summary projection', () => {
    const vm = toPostDetail(base);
    expect(vm.content).toBe(base.content);
    expect(vm.slug).toBe('hoi-an');
    expect(vm.coverUrl).toBeNull();
  });
});

describe('fallbackExcerpt', () => {
  it('strips markdown syntax, links, and collapses whitespace', () => {
    expect(fallbackExcerpt('## Title\n\n**bold** [link](https://x.com)')).toBe('Title bold link');
  });

  it('clamps long content on a word boundary with an ellipsis', () => {
    const long = Array.from({ length: 60 }, () => 'word').join(' ');
    const out = fallbackExcerpt(long);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('wor…'); // never cuts mid-word
  });

  it('returns short content unchanged', () => {
    expect(fallbackExcerpt('Just a short line.')).toBe('Just a short line.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @tourism/web --testPathPatterns=lib/blog/post-vm`
Expected: FAIL — `Cannot find module './post-vm'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/lib/blog/post-vm.ts`:

```ts
import type { components } from '@tourism/core';

type PostDto = components['schemas']['PostDto'];

/** Card/list projection of a post (no body). */
export interface PostSummaryVM {
  slug: string;
  title: string;
  /** Stored excerpt, else derived from `content` — never empty for real content. */
  excerpt: string;
  /** ISO timestamp; null-safe (defensive — public posts are published, but don't crash). */
  publishedAt: string | null;
  /** Hero-role cover url, else the first attachment, else null (covers are optional). */
  coverUrl: string | null;
}

/** Full article projection (summary + markdown body). */
export interface PostDetailVM extends PostSummaryVM {
  content: string;
}

const EXCERPT_MAX = 160;

/** Plain-text excerpt from markdown (same stripping as `readingStats`), clamped on a word. */
export function fallbackExcerpt(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= EXCERPT_MAX) return plain;
  const cut = plain.slice(0, EXCERPT_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : EXCERPT_MAX).trimEnd()}…`;
}

function pickCoverUrl(dto: PostDto): string | null {
  const media = dto.media ?? [];
  return (media.find((m) => m.role === 'hero') ?? media[0])?.url ?? null;
}

export function toPostSummary(dto: PostDto): PostSummaryVM {
  return {
    slug: dto.slug,
    title: dto.title,
    excerpt: dto.excerpt?.trim() || fallbackExcerpt(dto.content),
    publishedAt: dto.publishedAt,
    coverUrl: pickCoverUrl(dto),
  };
}

export function toPostDetail(dto: PostDto): PostDetailVM {
  return { ...toPostSummary(dto), content: dto.content };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test @tourism/web --testPathPatterns=lib/blog/post-vm`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/blog/post-vm.ts apps/web/src/lib/blog/post-vm.spec.ts
git commit -m "feat(web): post view-model mapper with cover/excerpt null-safety"
```

### Task 3: Typed post fetchers + shared PostCard extraction

**Files:**
- Create: `apps/web/src/lib/api/posts.ts`
- Create: `apps/web/src/components/blog/post-card.tsx`
- Modify: `apps/web/src/components/marketing/blog-teaser.tsx` (drop local `PostCard`, re-import)

**Interfaces:**
- Consumes: `getApiClient()` from `../api/client` (Task-independent, exists) ·
  `toPostSummary`/`toPostDetail`/`PostSummaryVM`/`PostDetailVM` from Task 2 ·
  `messages.blog.readMore`/`featuredLabel` (existing i18n keys).
- Produces: `fetchPosts(opts?: { page?: number; pageSize?: number }): Promise<{ posts: PostSummaryVM[]; meta: PageMetaDto }>` (throws on error) ·
  `fetchPostSlugs(): Promise<string[]>` (empty on error) ·
  `fetchPost(slug: string): Promise<PostDetailVM | null>` (React `cache()`d) ·
  `<PostCard post={PostSummaryVM} featured?={boolean} />`.

- [ ] **Step 1: Create the fetchers**

Create `apps/web/src/lib/api/posts.ts`:

```ts
import { cache } from 'react';

import type { components } from '@tourism/core';

import {
  toPostDetail,
  toPostSummary,
  type PostDetailVM,
  type PostSummaryVM,
} from '../blog/post-vm';
import { getApiClient } from './client';

type PaginatedPostsDto = components['schemas']['PaginatedPostsDto'];
type PostDto = components['schemas']['PostDto'];
type PageMetaDto = components['schemas']['PageMetaDto'];

export interface PostsPage {
  posts: PostSummaryVM[];
  meta: PageMetaDto;
}

/**
 * One page of published posts, newest first. List responses map 1:1 (`{ data, meta }` IS the
 * body — no `.data` unwrap, unlike the single-resource fetch below). Throws on an API error so
 * callers pick their own degradation (home falls back to fixtures; `/blog` shows a notice).
 */
export async function fetchPosts(
  opts: { page?: number; pageSize?: number } = {},
): Promise<PostsPage> {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts', {
    params: { query: { page: opts.page ?? 1, pageSize: opts.pageSize ?? 12 } },
  });
  const body = data as unknown as PaginatedPostsDto | undefined;
  if (error || !body) throw new Error('Failed to load posts');
  return { posts: body.data.map(toPostSummary), meta: body.meta };
}

/** Published post slugs for `generateStaticParams`/sitemap (empty on error → on-demand). */
export async function fetchPostSlugs(): Promise<string[]> {
  const page = await fetchPosts({ pageSize: 100 }).catch(() => null);
  return page?.posts.map((p) => p.slug) ?? [];
}

/**
 * Full article for a slug, or `null` when unknown/unpublished. The single-resource response is
 * enveloped (`{ data }`) → unwrap `.data` (envelope gotcha). Wrapped in React `cache()` so
 * `generateMetadata` and the page body share one fetch per request.
 */
export const fetchPost = cache(async (slug: string): Promise<PostDetailVM | null> => {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts/{slug}', {
    params: { path: { slug } },
  });
  const dto = (data as unknown as { data?: PostDto } | undefined)?.data;
  if (error || !dto) return null;
  return toPostDetail(dto);
});
```

- [ ] **Step 2: Extract the shared PostCard**

Create `apps/web/src/components/blog/post-card.tsx` (the teaser's card, retyped onto
`PostSummaryVM`, real `next/link` href, null-safe cover/date):

```tsx
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
```

- [ ] **Step 3: Re-point the teaser at the shared card**

Rewrite `apps/web/src/components/marketing/blog-teaser.tsx` — drop the local `PostTeaser` type,
`cardShell`, `dateFmt`, and `PostCard` function; keep the section layout and fixtures (now in
`PostSummaryVM` shape). Full new content:

```tsx
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
  },
  {
    slug: 'two-unhurried-days-in-hoi-an',
    title: 'Two unhurried days in Hội An',
    excerpt: 'Lanterns, tailors, and riverside mornings — a slow itinerary for the old town.',
    publishedAt: '2026-04-30',
    coverUrl: cover('photo-1583417319070-4a69db38a482'),
  },
  {
    slug: 'morning-at-the-mekong-floating-markets',
    title: 'A morning at the Mekong floating markets',
    excerpt: 'Dawn on the delta: what to expect, what to eat, and how to find the quieter channels.',
    publishedAt: '2026-04-12',
    coverUrl: cover('photo-1528181304800-259b08848526'),
  },
];

export function BlogTeaser() {
  const t = messages.blog;
  const [lead, ...rest] = fixturePosts;

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
```

(The `posts` prop + real-data wiring is Task 8 — this task only swaps the card implementation;
visuals unchanged.)

- [ ] **Step 4: Verify lint + tests + typecheck**

Run: `pnpm nx run-many -t lint test typecheck -p @tourism/web`
Expected: green; test count unchanged from Task 2 (no new tests here — fetchers are thin I/O per
`tour-detail.ts` convention; the mapper logic is already covered).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api/posts.ts apps/web/src/components/blog/post-card.tsx apps/web/src/components/marketing/blog-teaser.tsx
git commit -m "feat(web): typed post fetchers + shared PostCard (teaser re-pointed)"
```

### Task 4: Article markdown renderer with anchored headings

**Files:**
- Create: `apps/web/src/components/blog/post-content.tsx`

**Interfaces:**
- Consumes: `slugifyHeading` from Task 1; `react-markdown` + `remark-gfm` (already deps).
- Produces: `<PostContent content={string} />` — server component; h1/h2 render as `<h2>` and
  h3 as `<h3>`, each with `id={slugifyHeading(headingText)}` and `scroll-mt-28` (sticky-header
  clearance) so the Task 5 outline anchors land.

- [ ] **Step 1: Create the renderer**

Create `apps/web/src/components/blog/post-content.tsx`:

```tsx
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { slugifyHeading } from '../../lib/blog/derive';

/** Flattens a heading's children to plain text so ids match `extractOutline`'s raw text. */
function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return headingText((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

const H2_CLASS =
  'font-heading text-foreground mt-10 mb-4 scroll-mt-28 text-2xl font-semibold text-balance first:mt-0';
const H3_CLASS =
  'font-heading text-foreground mt-8 mb-3 scroll-mt-28 text-xl font-semibold text-balance first:mt-0';

/** h1 normalizes to h2 — same rule as `extractOutline` (depth 1 → 2), one visual scale. */
function AnchoredH2({ children, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2 id={slugifyHeading(headingText(children))} className={H2_CLASS} {...props}>
      {children}
    </h2>
  );
}

function AnchoredH3({ children, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3 id={slugifyHeading(headingText(children))} className={H3_CLASS} {...props}>
      {children}
    </h3>
  );
}

/**
 * Markdown → styled article body. Scoped classes (no typography plugin) keep the bundle lean and
 * the rendering on-brand; raw HTML is NOT enabled (no `rehype-raw`), so authored content can't
 * inject scripts. Headings carry stable anchor ids for the outline rail.
 */
const MD_COMPONENTS: Components = {
  h1: (props) => <AnchoredH2 {...props} />,
  h2: (props) => <AnchoredH2 {...props} />,
  h3: (props) => <AnchoredH3 {...props} />,
  h4: (props) => <h4 className="text-foreground mt-6 mb-2 font-semibold first:mt-0" {...props} />,
  p: (props) => (
    <p className="text-muted-foreground mb-4 leading-relaxed text-pretty last:mb-0" {...props} />
  ),
  strong: (props) => <strong className="text-foreground font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="mb-4 list-disc space-y-1.5 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 last:mb-0" {...props} />,
  li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
    <li className="text-muted-foreground marker:text-primary/60 leading-relaxed text-pretty" {...props}>
      {children}
    </li>
  ),
  a: (props) => <a className="text-primary font-medium hover:underline" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-primary/40 text-muted-foreground my-6 border-l-4 pl-4 italic" {...props} />
  ),
  hr: () => <hr className="border-border/60 my-8" />,
  // Article images are author-managed Cloudinary/remote URLs of unknown dimensions — a plain
  // <img> (like the admin preview) beats next/image's required width/height here.
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" className="my-6 w-full rounded-xl" {...props} alt={props.alt ?? ''} />
  ),
  pre: (props) => (
    <pre className="bg-muted my-6 overflow-x-auto rounded-lg p-4 text-sm" {...props} />
  ),
  code: (props) => <code className="bg-muted rounded px-1.5 py-0.5 text-[0.9em]" {...props} />,
  table: (props) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-border/60 text-foreground border-b px-3 py-2 text-left font-semibold" {...props} />
  ),
  td: (props) => <td className="border-border/40 border-b px-3 py-2 align-top" {...props} />,
};

/** The article body for `/blog/[slug]` (server component — react-markdown is RSC-safe). */
export function PostContent({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-base">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default PostContent;
```

- [ ] **Step 2: Verify lint + typecheck**

Run: `pnpm nx run-many -t lint typecheck -p @tourism/web`
Expected: green (component is exercised visually by Task 5's page; anchor correctness rests on
the Task-1-tested `slugifyHeading`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/blog/post-content.tsx
git commit -m "feat(web): article markdown renderer with anchored headings"
```

### Task 5: `/blog/[slug]` article page + i18n + Article JSON-LD

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts` (extend `blog` block, after `featuredLabel`)
- Modify: `apps/web/src/components/seo/json-ld.tsx` (append `ArticleJsonLd`)
- Create: `apps/web/src/app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `fetchPost`/`fetchPosts`/`fetchPostSlugs` (Task 3) · `extractOutline`/`readingStats`
  (Task 1) · `PostCard` (Task 3) · `PostContent` (Task 4) · `BreadcrumbJsonLd` (existing).
- Produces: the route; `ArticleJsonLd({ title, description?, image?, slug, datePublished? })`;
  i18n keys `messages.blog.{indexTitle,breadcrumb,minRead,byline,outlineHeading,moreHeading,backToBlog,emptyTitle,emptyBody,loadError}`.

- [ ] **Step 1: Extend `messages.blog`**

In `libs/shared/i18n/src/lib/messages.ts`, replace the closing of the `blog` block:

```ts
    viewAll: 'Read the journal',
    readMore: 'Read more',
    featuredLabel: 'Featured',
  },
```

with:

```ts
    viewAll: 'Read the journal',
    readMore: 'Read more',
    featuredLabel: 'Featured',
    indexTitle: 'Travel journal',
    breadcrumb: 'Journal',
    minRead: (minutes: number) => `${minutes} min read`,
    byline: (brand: string) => `By the ${brand} team`,
    outlineHeading: 'In this post',
    moreHeading: 'More from the journal',
    backToBlog: 'Back to the journal',
    emptyTitle: 'No stories yet',
    emptyBody: 'We are writing our first guides now - check back soon.',
    loadError: 'The journal could not be loaded right now. Please try again in a moment.',
  },
```

- [ ] **Step 2: Add `ArticleJsonLd`**

Append to `apps/web/src/components/seo/json-ld.tsx`:

```tsx
export type ArticleJsonLdProps = {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  datePublished?: string;
};

/** Article schema for a journal post. Public posts carry no personal author → brand byline. */
export function ArticleJsonLd({ title, description, image, slug, datePublished }: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        url: absoluteUrl(`/blog/${slug}`),
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(datePublished ? { datePublished } : {}),
        author: { '@type': 'Organization', name: messages.brand.name, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: messages.brand.name,
          logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.svg') },
        },
      }}
    />
  );
}
```

- [ ] **Step 3: Create the article page**

Create `apps/web/src/app/blog/[slug]/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Verify lint + tests + typecheck + build**

Run: `pnpm nx run-many -t lint test typecheck build -p @tourism/web @tourism/i18n`
Expected: green. Build prerenders `/blog/[slug]` via `generateStaticParams` (empty slug list is
fine if the local API is down — pages render on demand).

- [ ] **Step 5: Commit**

```bash
git add libs/shared/i18n/src/lib/messages.ts apps/web/src/components/seo/json-ld.tsx "apps/web/src/app/blog/[slug]/page.tsx"
git commit -m "feat(web): /blog/[slug] article page - outline rail, reading time, Article JSON-LD"
```

### Task 6: Slice 1 gate + merge

- [ ] **Step 1: Full gate**

Run: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`
Expected: all green (web + i18n consumers rebuild; api/admin unaffected).

- [ ] **Step 2: Merge to main** (pre-authorized on green gate)

```bash
git checkout main && git pull && git merge --no-ff feat/web-blog-reader && git push && git branch -d feat/web-blog-reader
```

---

## Slice 2 — index + wiring (branch `feat/web-blog-index`)

### Task 7: `/blog` index — magazine grid + URL pagination + empty/error states

**Files:**
- Create: `apps/web/src/app/blog/page.tsx`

**Interfaces:**
- Consumes: `fetchPosts` (Task 3) · `PostCard` (Task 3) · `pageNumbers` from
  `../../lib/paginate` (existing) · `Pagination*` primitives from `@tourism/ui` ·
  `messages.blog.*` (Task 5 keys) · `BreadcrumbJsonLd`.
- Produces: the `/blog` route. Reading `?page=` makes it dynamically rendered per request
  (accepted — like `/contact`; detail + home stay static).

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull && git checkout -b feat/web-blog-index
```

- [ ] **Step 2: Create the index page**

Create `apps/web/src/app/blog/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Verify**

Run: `pnpm nx run-many -t lint test typecheck build -p @tourism/web`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/blog/page.tsx
git commit -m "feat(web): /blog index - magazine hero, URL pagination, honest empty/error states"
```

### Task 8: Home wiring + nav/footer links + sitemap

**Files:**
- Modify: `apps/web/src/components/marketing/blog-teaser.tsx` (accept `posts` prop; fixtures →
  fallback only; viewAll → `/blog`)
- Modify: `apps/web/src/app/page.tsx` (fetch 3 posts, pass into teaser)
- Modify: `libs/shared/i18n/src/lib/messages.ts` (`nav.blog`; footer support link)
- Modify: `apps/web/src/components/layout/site-header.tsx` (desktop + mobile nav links)
- Modify: `apps/web/src/app/sitemap.ts` (`/blog` + post slugs)

**Interfaces:**
- Consumes: `fetchPosts`/`fetchPostSlugs` (Task 3) · `PostSummaryVM` (Task 2).
- Produces: `BlogTeaser({ posts }: { posts: PostSummaryVM[] })` · `messages.nav.blog: 'Journal'`.

- [ ] **Step 1: Teaser accepts real posts (fixtures = fallback only)**

In `apps/web/src/components/marketing/blog-teaser.tsx`, change the component (fixtures block
from Task 3 stays as-is above it):

```tsx
/**
 * Home journal teaser. Server page passes real posts (`fetchPosts({ pageSize: 3 })`); on API
 * error/empty the FIXTURES above keep the section alive (home must never look broken — the
 * established home-section pattern). The real `/blog` page does NOT fall back like this.
 */
export function BlogTeaser({ posts }: { posts: PostSummaryVM[] }) {
  const t = messages.blog;
  const items = posts.length > 0 ? posts.slice(0, 3) : fixturePosts;
  const [lead, ...rest] = items;
```

and swap the "view all" CTA anchor from `href="#journal"` to the real route (the section itself
keeps its `id="journal"`):

```tsx
          <a
            href="/blog"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'shrink-0 max-sm:hidden')}
          >
            {t.viewAll}
            <ArrowRightIcon />
          </a>
```

- [ ] **Step 2: Home page fetches posts**

In `apps/web/src/app/page.tsx`, extend the parallel fetch:

```tsx
import { fetchPosts } from '../lib/api/posts';
```

```tsx
  const [featured, tiles, counts, posts] = await Promise.all([
    fetchTourCards({ featured: true }).catch(() => []),
    fetchDestinationTiles().catch(() => []),
    fetchTourDestinationCounts().catch(() => ({})),
    fetchPosts({ pageSize: 3 })
      .then((page) => page.posts)
      .catch(() => []),
  ]);
```

and pass into the teaser:

```tsx
      <Reveal>
        <BlogTeaser posts={posts} />
      </Reveal>
```

- [ ] **Step 3: Nav + footer links via i18n**

In `libs/shared/i18n/src/lib/messages.ts`:

1. In the `nav` block, after `contact: 'Contact',` add:

```ts
    blog: 'Journal',
```

2. In `footer.support`, after the FAQs entry add:

```ts
      { label: 'Travel journal', href: '/blog' },
```

In `apps/web/src/components/layout/site-header.tsx`:

1. Desktop nav — after the Destinations `</NavigationMenu>` and before the About link:

```tsx
            <a href="/blog" className={linkClass} aria-current={current('/blog')}>
              {t.blog}
            </a>
```

2. `mobileNav` array — insert after the destinations items:

```tsx
const mobileNav = [
  { label: messages.nav.tours, href: '/tours' },
  ...messages.nav.destinationsMenu.items.map((i) => ({ label: i.label, href: i.href })),
  { label: messages.nav.blog, href: '/blog' },
  { label: messages.nav.about, href: '/about' },
  { label: messages.nav.contact, href: '/contact' },
];
```

- [ ] **Step 4: Sitemap**

In `apps/web/src/app/sitemap.ts`:

1. Add to `STATIC_PATHS` after the `/destinations` entry:

```ts
  { path: '/blog', priority: 0.6, changeFrequency: 'daily' },
```

2. Import + fetch post slugs (mirror the tour-slug error tolerance):

```ts
import { fetchPostSlugs } from '../lib/api/posts';
```

```ts
  const [tourSlugs, postSlugs] = await Promise.all([
    fetchTourDetailSlugs().catch(() => [] as string[]),
    fetchPostSlugs().catch(() => [] as string[]),
  ]);
```

(replaces the existing single `tourSlugs` line)

3. Add entries before the final return:

```ts
  const postEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));
```

```ts
  return [...staticEntries, ...regionEntries, ...tourEntries, ...postEntries];
```

- [ ] **Step 5: Verify**

Run: `pnpm nx run-many -t lint test typecheck build -p @tourism/web @tourism/i18n`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/marketing/blog-teaser.tsx apps/web/src/app/page.tsx libs/shared/i18n/src/lib/messages.ts apps/web/src/components/layout/site-header.tsx apps/web/src/app/sitemap.ts
git commit -m "feat(web): wire home teaser to real posts + Journal nav/footer/sitemap"
```

### Task 9: Slice 2 gate + merge + docs

- [ ] **Step 1: Full gate**

Run: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`
Expected: all green.

- [ ] **Step 2: Merge to main** (pre-authorized on green gate)

```bash
git checkout main && git pull && git merge --no-ff feat/web-blog-index && git push && git branch -d feat/web-blog-index
```

- [ ] **Step 3: Mark plan STATUS + update docs/memory** (per standing workflow — before moving on)

---

## STATUS

- [x] Slice 1 (Tasks 1-6): foundation + `/blog/[slug]` — **DONE**, merged `2631471` (2026-07-03).
  All task reviews approved; build prerendered 7 real articles from the live API.
- [x] Slice 2 (Tasks 7-9): `/blog` index + wiring — **DONE**, merged `295ecfa` (2026-07-03).
  Final whole-feature review: Ready to merge, 0 Critical/Important.

**P6 COMPLETE.** Web suite 148 tests (129 pre-existing + 10 derive + 9 post-vm).

### Fast-follows (accepted non-blocking, from reviews)

1. **Outline-slug mismatch on markdown-in-headings** — `extractOutline` slugifies RAW heading
   markdown while the rendered heading id comes from flattened text; a heading containing a
   markdown link/inline code produces a dead outline anchor (silent). Plain-text headings —
   all current content — are unaffected. Fix: strip markdown from heading text in
   `extractOutline` (reuse the `readingStats` stripping) before `slugifyHeading`.
2. **DRY: markdown-stripping regex duplicated** in `lib/blog/derive.ts` (`readingStats`) and
   `lib/blog/post-vm.ts` (`fallbackExcerpt`) — extract a shared `stripMarkdownSyntax` in
   `derive.ts` when next touching either.
3. `/blog` renders dynamically per request (reads `?page=`) — accepted by design (spec);
   revisit only if the sleepy Render API makes the page feel slow (route-segment
   `/blog/page/[n]` would restore full static).
