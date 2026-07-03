# Web blog reader (P6) — design

- **Date:** 2026-07-03
- **Scope:** `@tourism/web` only — the public blog reader: `/blog` index (magazine layout +
  pagination) · `/blog/[slug]` (markdown article + reading extras) · home `BlogTeaser` wired to
  real posts · nav/footer links · sitemap/SEO. **Zero BE change** — the public posts API and the
  admin authoring pipeline are complete.
- **Status:** approved direction, spec for execution
- **Trigger:** the long-standing P6 gap (deferred 2026-06-30): home `BlogTeaser` renders
  placeholder fixtures with dead `#post-…` anchors; no `/blog` routes exist. Admin is DONE →
  this is the next phase.

## Key facts (verified)

- **BE is ready:** `GET /posts` (public, PUBLISHED-only + `publishedAt <= now`, paginated
  `page/pageSize` default 12, `search` title filter available but unused this phase, newest
  first) and `GET /posts/:slug`. `PostDto` ships `media[]` (cover — `MediaOwnerType.POST`, Wave
  1) and `author { fullName, avatarUrl }`. `Post.content` is **markdown**.
- **Visual language exists:** `components/marketing/blog-teaser.tsx` — featured-first magazine
  grid (lead card spans 2 cols/rows), card shell classes, `messages.blog` copy
  (heading/subtitle/viewAll/readMore/featuredLabel). The index extends this language.
- **Markdown infra exists in web:** `react-markdown` + `remark-gfm` (itinerary renderer,
  scoped `components` map, NO rehype-raw → no XSS). Admin's `PostContent` is the fuller
  reference implementation.
- **Derive logic exists, tested:** admin `lib/posts/derive.ts` — `readingStats` (~200 wpm) +
  `extractOutline` (h1–h3, fence-safe, cap 12) with specs. Port to web verbatim.
- **Conventions to reuse:** ISR `revalidate = 300` + React `cache()` on detail fetch (kills the
  generateMetadata+body double-fetch — the `fetchTourDetail` pattern) · fixture fallback on API
  error for home sections · `lib/paginate.ts` (`pageView`/`pageNumbers`) + `@tourism/ui`
  Pagination primitives (region pages) · `components/seo/json-ld.tsx` (escapes `<`) ·
  `app/sitemap.ts` already fetches live tour slugs — posts mirror it · copy in `@tourism/i18n`
  (EN-only) · tokens-only, no hex · `motion-safe` transitions.

## Decisions (user-confirmed)

1. **Index = magazine + pagination** (hero = newest post; grid for the rest; URL-driven
   `?page=`). No search box this phase (YAGNI — BE support exists, one-line add later).
2. **Detail = full extras:** reading time · "In this post" outline rail (hidden under 2
   headings, anchor links) · "More from the journal" footer (3 newest OTHER posts — no tags
   exist, so recency is the relation) + CTA back to `/blog`.

## Slice 1 — foundation + article page

- **`apps/web/src/lib/api/posts.ts`** — typed fetchers via `@tourism/core`:
  `fetchPosts({ page, pageSize }): Promise<{ posts: PostSummary[]; meta: PageMeta }>` (list
  envelope) and `fetchPost(slug)` (single-resource `.data` unwrap) wrapped in React `cache()`.
  Both `next: { revalidate: 300 }`. A view-model mapper picks: slug, title, excerpt,
  publishedAt, coverUrl (first `media[]` url, null-safe), author (fullName, avatarUrl),
  content (detail only).
- **`apps/web/src/lib/blog/derive.ts` + spec** — `readingStats` + `extractOutline` ported
  verbatim from `apps/admin/src/lib/posts/derive.ts` (tests come along; TDD-by-port).
- **Shared card (extracted HERE so slice 1's footer can use it):** the teaser's `PostCard` moves
  to `apps/web/src/components/blog/post-card.tsx` (props: post VM + `featured?`), links become
  real `next/link` → `/blog/[slug]`; `BlogTeaser` immediately re-imports it (visuals unchanged,
  fixtures still feeding it until slice 2 wires real data).
- **Route `/blog/[slug]`** (`app/blog/[slug]/page.tsx`, SSG via `generateStaticParams` from
  `fetchPosts` slugs + ISR 300; unknown slug → `notFound()`):
  - Cover hero (when present) → article header: title (display serif per site headings) ·
    author line (avatar w/ initials fallback · fullName · publish date · "X min read") →
    **markdown body** (`react-markdown` + `remark-gfm`, scoped components map styled with
    tokens; headings get stable `id`s — same slugify as `extractOutline` — so outline anchors
    land; no rehype-raw).
  - **Rail "In this post"**: outline links (≥2 headings only), sticky on desktop, plain list on
    mobile above the body.
  - **Footer "More from the journal"**: 3 newest posts excluding the current one (from
    `fetchPosts({ pageSize: 4 })` minus self), rendered with the shared post card + CTA link to
    `/blog`.
  - SEO: `generateMetadata` (title → `%s — Nexora` template, description = excerpt fallback
    trimmed content, canonical, OG/twitter image = cover) · JSON-LD **`Article`** (headline,
    datePublished, author name, image) + `BreadcrumbList` (Home → Blog → post) via the existing
    `json-ld.tsx`.
- New copy → `messages.blog` (reading-time label, outline heading, more-posts heading, back-to-
  blog CTA, empty states).

## Slice 2 — index + wiring

- **Route `/blog`** (`app/blog/page.tsx`, server, ISR 300, reads `?page=`):
  - Page 1: hero = newest post (featured card treatment, full-width emphasis) + 3-col grid of
    the rest of the page.
  - Page 2+: plain grid (no hero — the hero is "the latest", not "first of every page").
  - Pagination via `lib/paginate.ts` + `@tourism/ui` Pagination (region-page pattern), hidden on
    a single page; `?page=` out-of-range clamps via `notFound()`/redirect-to-1 — pick clamp-to-1
    (friendlier).
  - Header: `messages.blog.heading`/`subtitle` (same voice as the teaser). Empty state when no
    posts. API error → `ErrorAlert`-equivalent marketing-styled notice (no fixture fallback here
    — a real reader page shouldn't show fake articles; only the HOME teaser keeps fallback).
- **Home `BlogTeaser` → real data:** the home page (server) fetches
  `fetchPosts({ pageSize: 3 })` and passes posts into `BlogTeaser` (becomes presentational);
  fixture fallback stays for API-error/empty (home must never look broken — established home
  pattern). "View all" → `/blog`; cards → `/blog/[slug]`. Posts without a cover use the existing
  placeholder treatment (muted panel), never a broken image.
- **Nav + footer:** "Blog" link in the navbar pill (after Tours/Destinations — exact order per
  current nav array) and in the footer Information column; copy via `@tourism/i18n`.
- **Sitemap:** `app/sitemap.ts` adds `/blog` + live post slugs (mirror the tour-slug fetch,
  same error-tolerant approach).

## Out of scope

Post tags/categories · comments · share buttons · RSS feed · index search box · related-by-tag
logic · admin changes · any BE change.

## Testing & process

- TDD on pure logic: `lib/blog/derive.ts` (ported specs) + the post view-model mapper
  (cover/author/date null-safety) + any pagination-clamp helper. Layout via build gate + user
  review on deploy (established web convention).
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. Baselines:
  web tests 136 (verify at plan time), api 291, admin 134 untouched.
- SDD: haiku transcription / sonnet reasoning + all task reviewers. **No BE surface → no
  `ecc:code-reviewer` pass** (per-task reviews only), matching the FE-slice convention.
- Merge-to-main per green slice pre-authorized. Straight quotes in code; never stage unrelated
  dirty files. Next.js 16 is post-training — check live docs before any routing/RSC subtlety.

## Risks

- **Markdown heading ids:** the outline's anchor slugs and the rendered headings' `id`s MUST
  use the same slugify — put it in `derive.ts` and share (one source), else anchors silently
  miss.
- **SSG + sleepy Render:** `generateStaticParams` at build time hits the API — the known
  Vercel/Render deploy race can 502 a prerender; transient, Redeploy fixes
  (memory: vercel-render-deploy-race). ISR keeps pages fresh afterwards.
- **Posts without cover/excerpt:** every VM field null-safe; hero without a cover falls back to
  the muted panel treatment, metadata falls back to trimmed content.
- **Fixture drift:** BlogTeaser keeps its fixtures ONLY as fallback — mark them clearly so
  nobody mistakes them for content.

## Success criteria

- Home teaser shows real posts and every card lands on a real, readable, SEO-complete article;
  `/blog` paginates the archive with the magazine hero; nav/footer/sitemap all point at the new
  surface. Gate green per slice; the web app finally has no placeholder-content section.
