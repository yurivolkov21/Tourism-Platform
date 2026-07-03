# Blog v2 Wave 2 — Reader Funnel + Taxonomy UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Articles show real author, topic chips, hand-picked tour cards + enquiry CTA;
"More from the journal" prefers same-topic posts; `/blog` filters by tag chip + free-text
search. Web-only — zero BE/schema change (Wave 1 shipped all data).

**Architecture:** One slice, branch `feat/blog-v2-reader-funnel`, 6 tasks: (1) VM/fetcher
extensions TDD, (2) `pickMorePosts` TDD, (3) i18n + shared PostCard chips + fixture reshape,
(4) article page (byline/tags/tours/CTA/related-by-tag/JSON-LD Person), (5) index page
(chips + search toolbar, filter-aware hero/empty/pagination), (6) final review + gate +
merge + docs.

**Tech Stack:** Next.js 16 App Router · `@tourism/core` regen'd schema (PostDetailDto,
PostTagWithCountDto) · existing `toTourCard`/`TourCard`/`EnquiryCta` · `@tourism/i18n` ·
Jest.

**Spec:** `docs/06-specs/2026-07-03-blog-v2-wave2-reader-funnel-design.md` (approved).

## Global Constraints

- Straight ASCII quotes in code (haiku gotcha); Vietnamese strings keep diacritics.
- Never stage unrelated dirty files (`docs/07-plans/2026-07-02-*.md`, `playground.md`).
- Conventional Commits, no AI attribution.
- Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. Baselines:
  web 148 (grows) · api 301 · admin 139 (both untouched).
- Deploy-lag guards (`?? []` / `?? null`) on EVERY new DTO field access even though Wave 1
  is already deployed — the standing rule.
- All user-facing copy via `@tourism/i18n`; tokens only, no hex; relative imports.
- `PostCard` is wrapped in a `next/link` — tag chips on the CARD must be non-interactive
  labels (nested links are invalid HTML); chips are links only on the article header and
  the `/blog` toolbar.
- The index must preserve `tag` AND `q` together in every link/form (BE ANDs them).

---

### Task 1: VM + fetcher extensions (TDD)

**Files:**
- Modify: `apps/web/src/lib/blog/post-vm.ts`
- Modify: `apps/web/src/lib/blog/post-vm.spec.ts`
- Modify: `apps/web/src/lib/api/posts.ts`
- Modify: `apps/web/src/components/marketing/blog-teaser.tsx` (fixture reshape — VM type forces it)

**Interfaces:**
- Consumes: `toTourCard(dto: TourSummaryDto): TourCardData` from `../api/tours` ·
  generated `PostDetailDto`/`PostTagWithCountDto` from `@tourism/core`.
- Produces: `PostTagVM { slug; name }` · `PostAuthorVM { fullName: string|null; avatarUrl: string|null }` ·
  `PostSummaryVM += tags: PostTagVM[]; author: PostAuthorVM` ·
  `PostDetailVM += relatedTours: TourCardData[]` ·
  `toPostDetail(dto: PostDetailDto)` (parameter type narrows) ·
  `fetchPosts(opts += { tag?: string; search?: string })` ·
  `fetchPostTags(): Promise<PostTagWithCountDto[]>` ([] on error).

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull && git checkout -b feat/blog-v2-reader-funnel
```

- [ ] **Step 2: Write the failing tests** — append to `post-vm.spec.ts` (and extend its
  imports):

```ts
type PostDetailDto = components['schemas']['PostDetailDto'];
type TourSummaryDto = components['schemas']['TourSummaryDto'];

/** Minimal valid tour summary; if the generated type requires more fields, add minimal
 * values rather than casting (the cast would hide schema drift). */
const tourSummary = (slug: string): TourSummaryDto =>
  ({
    id: `id-${slug}`,
    slug,
    title: `Tour ${slug}`,
    summary: null,
    durationDays: 3,
    basePrice: '499',
    compareAtPrice: null,
    currency: 'USD',
    isFeatured: false,
    badges: [],
    suitableFor: [],
    category: { slug: 'cruises', name: 'Cruises' },
    destinations: [],
    media: [{ publicId: 'p', url: 'https://cdn/hero.jpg', type: 'IMAGE', role: 'hero' }],
    averageRating: 4.5,
    reviewsCount: 10,
    nextDepartureDate: null,
    nextDepartureSeatsLeft: null,
  }) as TourSummaryDto;

describe('tags + author on summaries', () => {
  it('passes tags and author through', () => {
    const vm = toPostSummary({
      ...base,
      tags: [{ slug: 'ha-long', name: 'Hạ Long' }],
      author: { fullName: 'Ana', avatarUrl: 'https://cdn/a.jpg' },
    });
    expect(vm.tags).toEqual([{ slug: 'ha-long', name: 'Hạ Long' }]);
    expect(vm.author).toEqual({ fullName: 'Ana', avatarUrl: 'https://cdn/a.jpg' });
  });

  it('defaults tags/author when an older API omits them (deploy-lag)', () => {
    const legacy = { ...base } as Record<string, unknown>;
    delete legacy.tags;
    delete legacy.author;
    const vm = toPostSummary(legacy as unknown as typeof base);
    expect(vm.tags).toEqual([]);
    expect(vm.author).toEqual({ fullName: null, avatarUrl: null });
  });
});

describe('toPostDetail related tours', () => {
  it('maps relatedTours through toTourCard (pick order kept)', () => {
    const dto: PostDetailDto = {
      ...base,
      relatedTours: [tourSummary('first'), tourSummary('second')],
    };
    const vm = toPostDetail(dto);
    expect(vm.relatedTours.map((t) => t.slug)).toEqual(['first', 'second']);
    expect(vm.relatedTours[0].image).toBe('https://cdn/hero.jpg');
    expect(vm.relatedTours[0].rating).toBe(4.5);
  });

  it('defaults relatedTours to [] when absent (deploy-lag)', () => {
    const vm = toPostDetail({ ...base } as unknown as PostDetailDto);
    expect(vm.relatedTours).toEqual([]);
  });
});
```

Run: `pnpm nx test @tourism/web --testPathPatterns=lib/blog/post-vm`
Expected: FAIL (types + mapping missing).

- [ ] **Step 3: Implement `post-vm.ts`**

Extend imports + types:

```ts
import type { components } from '@tourism/core';

import type { TourCardData } from '../../components/tours/tour-card';
import { toTourCard } from '../api/tours';

type PostDto = components['schemas']['PostDto'];
type PostDetailDto = components['schemas']['PostDetailDto'];

export interface PostTagVM {
  slug: string;
  name: string;
}

export interface PostAuthorVM {
  fullName: string | null;
  avatarUrl: string | null;
}
```

`PostSummaryVM` gains two fields (after `coverUrl`):

```ts
  /** Topic chips (empty when untagged / older API). */
  tags: PostTagVM[];
  /** Public author (name + avatar only); nulls fall back to the brand byline. */
  author: PostAuthorVM;
```

`PostDetailVM` gains one field:

```ts
  /** Admin-picked tours as card view-models (published only, pick order). */
  relatedTours: TourCardData[];
```

`toPostSummary` return gains (deploy-lag guarded):

```ts
    tags: (dto.tags ?? []).map((t) => ({ slug: t.slug, name: t.name })),
    author: {
      fullName: dto.author?.fullName ?? null,
      avatarUrl: dto.author?.avatarUrl ?? null,
    },
```

`toPostDetail` narrows its parameter and maps tours:

```ts
export function toPostDetail(dto: PostDetailDto): PostDetailVM {
  return {
    ...toPostSummary(dto),
    content: dto.content,
    relatedTours: (dto.relatedTours ?? []).map(toTourCard),
  };
}
```

- [ ] **Step 4: Extend `lib/api/posts.ts`**

1. Type imports gain `PostDetailDto` + `PostTagWithCountDto`; drop the now-unused bare
   `PostDto` cast in `fetchPost` in favor of the detail DTO.
2. `fetchPosts` options + query:

```ts
export async function fetchPosts(
  opts: { page?: number; pageSize?: number; tag?: string; search?: string } = {},
): Promise<PostsPage> {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts', {
    params: {
      query: {
        page: opts.page ?? 1,
        pageSize: opts.pageSize ?? 12,
        ...(opts.tag ? { tag: opts.tag } : {}),
        ...(opts.search ? { search: opts.search } : {}),
      },
    },
  });
  const body = data as unknown as PaginatedPostsDto | undefined;
  if (error || !body) throw new Error('Failed to load posts');
  return { posts: body.data.map(toPostSummary), meta: body.meta };
}
```

3. `fetchPost` unwraps the detail DTO:

```ts
export const fetchPost = cache(async (slug: string): Promise<PostDetailVM | null> => {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts/{slug}', {
    params: { path: { slug } },
  });
  const dto = (data as unknown as { data?: PostDetailDto } | undefined)?.data;
  if (error || !dto) return null;
  return toPostDetail(dto);
});
```

4. New tag-list fetcher:

```ts
/** Public tags in use (bare-array endpoint → enveloped at runtime). [] on error. */
export async function fetchPostTags(): Promise<PostTagWithCountDto[]> {
  const api = getApiClient();
  const { data, error } = await api.GET('/api/v1/posts/tags');
  const list = (data as unknown as { data?: PostTagWithCountDto[] } | undefined)?.data;
  if (error || !list) return [];
  return list;
}
```

- [ ] **Step 5: Fixture reshape (same commit — keeps every commit build-green)**

The stricter `PostSummaryVM` breaks `blog-teaser.tsx`'s `fixturePosts` typing. Add to EVERY
fixture entry in `apps/web/src/components/marketing/blog-teaser.tsx`:

```ts
    tags: [],
    author: { fullName: null, avatarUrl: null },
```

(Fixtures stay tag-less on purpose — no fake taxonomy in the fallback.)

- [ ] **Step 6: Run tests + build**

Run: `pnpm nx run-many -t lint test build -p @tourism/web`
Expected: PASS (new post-vm tests green, build green).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/blog/post-vm.ts apps/web/src/lib/blog/post-vm.spec.ts apps/web/src/lib/api/posts.ts apps/web/src/components/marketing/blog-teaser.tsx
git commit -m "feat(web): post VM carries tags/author/related tours + tag & search fetchers"
```

### Task 2: `pickMorePosts` helper (TDD)

**Files:**
- Create: `apps/web/src/lib/blog/pick-more-posts.ts`
- Test: `apps/web/src/lib/blog/pick-more-posts.spec.ts`

**Interfaces:**
- Consumes: `PostSummaryVM` (Task 1 shape).
- Produces: `pickMorePosts(tagged: PostSummaryVM[], recent: PostSummaryVM[], selfSlug: string, count = 3): PostSummaryVM[]`.

- [ ] **Step 1: Write the failing test**

Create `pick-more-posts.spec.ts`:

```ts
import type { PostSummaryVM } from './post-vm';
import { pickMorePosts } from './pick-more-posts';

const post = (slug: string): PostSummaryVM => ({
  slug,
  title: slug,
  excerpt: 'x',
  publishedAt: null,
  coverUrl: null,
  tags: [],
  author: { fullName: null, avatarUrl: null },
});

describe('pickMorePosts', () => {
  it('prefers tagged posts, tops up with recent, excludes self, dedupes', () => {
    const tagged = [post('self'), post('a'), post('b')];
    const recent = [post('a'), post('c'), post('d')];
    expect(pickMorePosts(tagged, recent, 'self').map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });

  it('caps at count and preserves source order', () => {
    const tagged = [post('a'), post('b'), post('c'), post('d')];
    expect(pickMorePosts(tagged, [], 'self', 2).map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('returns fewer (or none) when sources run dry', () => {
    expect(pickMorePosts([], [post('self')], 'self')).toEqual([]);
    expect(pickMorePosts([post('x')], [], 'self').map((p) => p.slug)).toEqual(['x']);
  });
});
```

Run: `pnpm nx test @tourism/web --testPathPatterns=pick-more-posts` → FAIL.

- [ ] **Step 2: Implement**

Create `pick-more-posts.ts`:

```ts
import type { PostSummaryVM } from './post-vm';

/**
 * "More from the journal" selection: same-topic posts first, then recent ones as top-up.
 * Excludes the current post, dedupes by slug, preserves each source's order.
 */
export function pickMorePosts(
  tagged: PostSummaryVM[],
  recent: PostSummaryVM[],
  selfSlug: string,
  count = 3,
): PostSummaryVM[] {
  const out: PostSummaryVM[] = [];
  const seen = new Set([selfSlug]);
  for (const post of [...tagged, ...recent]) {
    if (seen.has(post.slug)) continue;
    seen.add(post.slug);
    out.push(post);
    if (out.length >= count) break;
  }
  return out;
}
```

- [ ] **Step 3: Run tests** — PASS expected.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/blog/pick-more-posts.ts apps/web/src/lib/blog/pick-more-posts.spec.ts
git commit -m "feat(web): pickMorePosts - same-topic first, recency top-up"
```

### Task 3: i18n keys + PostCard tag chips + fixture reshape

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts`
- Modify: `apps/web/src/components/blog/post-card.tsx`

**Interfaces:**
- Produces: `messages.blog.{bylineNamed,toursHeading,topicsLabel,allTag,searchPlaceholder,searchLabel,emptyFilteredBody,clearFilters}` ·
  `messages.enquiryCta.headings.blog(title)` · PostCard renders up to 2 tag labels.

- [ ] **Step 1: i18n**

In `messages.ts`, `blog` block — append after `loadError`:

```ts
    bylineNamed: (name: string) => `By ${name}`,
    toursHeading: 'Tours in this story',
    topicsLabel: 'Topics',
    allTag: 'All',
    searchPlaceholder: 'Search the journal…',
    searchLabel: 'Search articles',
    emptyFilteredBody: 'Nothing matches that filter yet - clear it to see every story.',
    clearFilters: 'Clear filters',
```

In `enquiryCta.headings` (currently `home`/`faq`/`destinations`/`about`) — append:

```ts
      blog: (title: string) => `Turn "${title}" into your own journey`,
```

- [ ] **Step 2: PostCard chips (labels, NOT links — the card is one big `<Link>`)**

In `post-card.tsx`, inside the content `<div>`, directly ABOVE the date span, add:

```tsx
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
```

- [ ] **Step 3: Verify + commit**

(Fixture reshape already happened in Task 1 — this task does NOT touch blog-teaser.)

Run: `pnpm nx run-many -t lint test build -p @tourism/web @tourism/i18n`
Expected: green (web 148 + 7 new from Tasks 1-2 ≈ 155; record exact).

```bash
git add libs/shared/i18n/src/lib/messages.ts apps/web/src/components/blog/post-card.tsx
git commit -m "feat(web): blog i18n keys + post-card topic labels"
```

### Task 4: Article page — byline, tag links, tours, CTA, related-by-tag, JSON-LD Person

**Files:**
- Modify: `apps/web/src/components/seo/json-ld.tsx` (ArticleJsonLd `authorName?`)
- Modify: `apps/web/src/app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `post.relatedTours: TourCardData[]` + `post.tags`/`post.author` (Task 1) ·
  `pickMorePosts` (Task 2) · i18n keys (Task 3) · existing `TourCard`
  (`components/tours/tour-card`, prop `tour`) · `EnquiryCta`
  (`components/marketing/enquiry-cta`, props `heading`/`prefillDestination`).

- [ ] **Step 1: ArticleJsonLd Person author**

In `json-ld.tsx`, extend the props type + author emission:

```tsx
export type ArticleJsonLdProps = {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  datePublished?: string;
  /** Real author name → Person; absent → Organization (brand) byline. */
  authorName?: string;
};
```

and inside the `data` object replace the `author:` line with:

```tsx
        author: authorName
          ? { '@type': 'Person', name: authorName }
          : { '@type': 'Organization', name: messages.brand.name, url: SITE_URL },
```

(function signature gains `authorName`.)

- [ ] **Step 2: Article page edits** (`app/blog/[slug]/page.tsx`)

1. Imports add:

```tsx
import { TourCard } from '../../../components/tours/tour-card';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { pickMorePosts } from '../../../lib/blog/pick-more-posts';
```

2. Replace the current `more` fetch (single `fetchPosts({ pageSize: 4 })` chain) with:

```tsx
  // Same-topic posts first (primary tag), recency top-up; both error-tolerant.
  const [taggedPage, recentPage] = await Promise.all([
    post.tags.length > 0
      ? fetchPosts({ tag: post.tags[0].slug, pageSize: 4 }).catch(() => null)
      : Promise.resolve(null),
    fetchPosts({ pageSize: 6 }).catch(() => null),
  ]);
  const more = pickMorePosts(taggedPage?.posts ?? [], recentPage?.posts ?? [], slug);
```

3. `ArticleJsonLd` gains `authorName={post.author.fullName ?? undefined}`.

4. Byline: replace the current byline `<span>` (the one rendering
   `t.byline(messages.brand.name)`) with:

```tsx
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
```

5. Tag chip links — directly AFTER the meta row `</div>` (still inside the `<header>`):

```tsx
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
```

6. "Tours in this story" — a new section BETWEEN `</article>` and the more-posts section:

```tsx
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
```

7. `EnquiryCta` as the LAST element inside `<main>` (after the more-posts section):

```tsx
      <EnquiryCta
        heading={messages.enquiryCta.headings.blog(post.title)}
        prefillDestination={post.relatedTours[0]?.title ?? post.title}
      />
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx run-many -t lint test build -p @tourism/web`
Expected: green; build still prerenders `/blog/[slug]` articles.

```bash
git add apps/web/src/components/seo/json-ld.tsx "apps/web/src/app/blog/[slug]/page.tsx"
git commit -m "feat(web): article funnel - real byline, topic links, tour cards, enquiry CTA, tag-aware related"
```

### Task 5: Index page — topic chips + search toolbar

**Files:**
- Modify: `apps/web/src/app/blog/page.tsx`

**Interfaces:**
- Consumes: `fetchPosts({ page, tag, search })` + `fetchPostTags()` (Task 1) · i18n keys
  (Task 3) · existing `Input`/`Button` from `@tourism/ui` · `SearchIcon` from lucide.

- [ ] **Step 1: Rework the page**

Apply these changes to `app/blog/page.tsx`:

1. Imports add `Link` (`next/link`), `SearchIcon` (`lucide-react`), `Input`, `Button` to
   the `@tourism/ui` import, and `fetchPostTags` to the posts-api import.

2. `searchParams` type widens + parsing (after `parsePage`):

```tsx
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
```

3. Href helper (replaces `pageHref`; module scope):

```tsx
/** `/blog` URL preserving the active tag + search (BE ANDs them) and an optional page. */
function blogHref(tag?: string, q?: string, page?: number): string {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (q) params.set('q', q);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : '/blog';
}
```

4. Data fetch becomes parallel (tags row is error-tolerant; a discriminated result avoids
   the assign-in-closure narrowing pitfall):

```tsx
  const [tagOptions, listResult] = await Promise.all([
    fetchPostTags().catch(() => []),
    fetchPosts({ page, pageSize: PAGE_SIZE, tag, search: q })
      .then((r) => ({ ok: true as const, r }))
      .catch(() => ({ ok: false as const })),
  ]);
  const result = listResult.ok ? listResult.r : null;
  const failed = !listResult.ok;
```

(the old `let result / try-catch` block is removed.)

5. Past-the-end clamp keeps filters: `redirect(blogHref(tag, q));`

6. Hero only on the unfiltered first page:

```tsx
  const showHero = page === 1 && !filtered && posts.length > 0;
```

7. Toolbar — insert between the header block and the `<div className="mt-10 sm:mt-14">`:

```tsx
          {tagOptions.length > 0 || filtered ? (
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
          ) : null}
```

with a small module-scope chip component (region-page chip language):

```tsx
/** Filter chip link (matches the region-page chip look). */
// (add `import type { ReactNode } from 'react';` to the page imports)
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
```

8. Filtered-empty state — the `posts.length === 0` branch becomes:

```tsx
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
```

9. Pagination preserves filters — `BlogPagination` gains `tag`/`q` props and every
   `PaginationLink` href becomes `blogHref(tag, q, targetPage)` (delete the old `pageHref`;
   call site: `<BlogPagination page={meta.page} totalPages={meta.totalPages} tag={tag} q={q} />`).

- [ ] **Step 2: Verify + commit**

Run: `pnpm nx run-many -t lint test build -p @tourism/web`
Expected: green (`/blog` stays dynamic ƒ).

```bash
git add apps/web/src/app/blog/page.tsx
git commit -m "feat(web): /blog topic chips + journal search with filter-aware states"
```

### Task 6: Final review + gate + merge + docs

- [ ] **Step 1: Final whole-branch review** (sonnet reviewer, package over
  `main..HEAD`) — cross-file consistency, funnel end-to-end, filter-preservation, i18n
  key consumption, no BE touch. Fix Critical/Important before merging.

- [ ] **Step 2: Full gate**

Run: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`
Expected: green.

- [ ] **Step 3: Merge (pre-authorized on green)**

```bash
git checkout main && git pull && git merge --no-ff feat/blog-v2-reader-funnel -m "Merge feat/blog-v2-reader-funnel: blog v2 wave 2 - reader funnel + taxonomy UX" && git push && git branch -d feat/blog-v2-reader-funnel
```

- [ ] **Step 4: Docs + memory** — this plan's STATUS + roadmap STATUS + memory update.

---

## STATUS

- [ ] Tasks 1-6 (single slice, web-only) — pending
