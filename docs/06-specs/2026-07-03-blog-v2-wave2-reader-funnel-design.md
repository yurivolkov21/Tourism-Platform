# Blog v2 Wave 2 — reader funnel + taxonomy UX

- **Date:** 2026-07-03
- **Roadmap:** `docs/07-plans/2026-07-03-blog-v2-roadmap.md` (Wave 2 of 5)
- **Scope:** `@tourism/web` ONLY — zero BE change, zero schema change. Wave 1 (merged
  `2f2193e`, migration live) supplies everything: public `PostDto.tags[]` +
  `author {fullName, avatarUrl}`, detail `relatedTours: TourSummaryDto[]`,
  `GET /posts/tags` (`PostTagWithCountDto[]`), `GET /posts?tag=&search=`.
- **Status:** direction locked in the roadmap (user 2026-07-03)

## Verified facts

- `toTourCard(dto: TourSummaryDto): TourCardData` is exported from
  `apps/web/src/lib/api/tours.ts` — related tours map straight onto the existing `TourCard`.
- `EnquiryCta` accepts `heading`/`subtitle`/`prefillDestination` (tour detail already uses
  the tour-aware variant).
- Web VMs live in `apps/web/src/lib/blog/post-vm.ts` (`PostSummaryVM`/`PostDetailVM`,
  tested); fetchers in `lib/api/posts.ts` (`fetchPosts`/`fetchPost`/`fetchPostSlugs`).
- `/blog` reads `?page=` (dynamic ƒ); `/blog/[slug]` is SSG + ISR 300; `ArticleJsonLd`
  currently hard-codes an Organization author.
- `messages.blog.*` carries all reader copy; `byline: (brand) => ...` is the brand-team line.
- The public tags endpoint returns only tags with ≥1 published post (`{slug, name, count}`).

## Design

### 1. VM + fetcher extensions (`lib/blog/post-vm.ts`, `lib/api/posts.ts`)

- `PostSummaryVM` **+=** `tags: { slug: string; name: string }[]` and
  `author: { fullName: string | null; avatarUrl: string | null }` (mapper passes them
  through null-safely: `dto.tags ?? []`, `dto.author ?? { fullName: null, avatarUrl: null }`
  — deploy-lag guards).
- `PostDetailVM` **+=** `relatedTours: TourCardData[]` — mapper takes the detail DTO's
  `relatedTours ?? []` through the existing `toTourCard` (import from `../api/tours`;
  post-vm stays pure — the DTO array is data in, `TourCardData[]` out).
- `fetchPosts` opts **+=** `tag?: string; search?: string` (forwarded to the query only when
  set). `fetchPost` switches its cast to the detail DTO (`PostDetailDto`) and maps through
  the extended `toPostDetail`.
- New `fetchPostTags(): Promise<{ slug: string; name: string; count: number }[]>` — bare
  array endpoint → enveloped at runtime → unwrap `.data`, `[]` on error.
- TDD: mapper null-safety (missing tags/author/relatedTours on an old-API response), tag
  passthrough, related-tour mapping through `toTourCard`.

### 2. Article page (`/blog/[slug]`)

- **Byline → real author:** avatar (initials fallback) + `By {fullName}`; when `fullName`
  is null fall back to the existing brand byline. New i18n
  `bylineNamed: (name: string) => \`By ${name}\`` (keep `byline` for the fallback).
- **Tag chips in the header** (under the meta row): small outline badges linking to
  `/blog?tag={slug}`.
- **"Tours in this story"** section between the article body and "More from the journal":
  renders `post.relatedTours` with the existing `TourCard` in a responsive grid (1/2/3
  cols), heading via new i18n `toursHeading`, hidden entirely when empty.
- **`EnquiryCta` at the very end** (after more-posts):
  `heading={messages.enquiryCta.headings.blog(post.title)}` — new i18n function mirroring
  the tour-detail pattern — and `prefillDestination={post.relatedTours[0]?.title ?? post.title}`.
- **Related-by-tag "More from the journal":** if the post has tags, fetch
  `fetchPosts({ tag: post.tags[0].slug, pageSize: 4 })`, drop self; if fewer than 3 remain,
  top up from the existing recency fetch (`fetchPosts({ pageSize: 6 })`, drop self +
  already-picked). All `.catch` → recency-only → empty (section hides). Pure helper
  `pickMorePosts(tagged, recent, selfSlug, count = 3): PostSummaryVM[]` in `lib/blog/`
  (TDD: dedupe, self-exclusion, top-up order, empty cases).
- **JSON-LD:** `ArticleJsonLd` gains optional `authorName?: string` — emits
  `author: { '@type': 'Person', name }` when present, else the current Organization
  author. Publisher unchanged.

### 3. Index page (`/blog`)

- **Toolbar row** between the header and the grid: tag chips + search box.
  - Chips: "All" + `fetchPostTags()` results (hide row entirely on error/empty). Active
    chip = `?tag=` match; chips are plain links (`/blog`, `/blog?tag=slug`, preserving `q`),
    styled like the region-page chip row (`rounded-full border` pattern).
  - Search: a GET `<form action="/blog">` with `<Input name="q">` (defaultValue from the
    URL) + hidden `tag` input so searching keeps the active chip; submit = Enter or a small
    Button. Server-side: `fetchPosts({ page, tag, search: q })`.
  - Any tag/search change naturally resets `?page=` (links/form omit it).
- Filtered-empty state: when `tag`/`q` active and no results, the empty panel shows a
  "clear filters" link back to `/blog` (new i18n `emptyFilteredBody` + `clearFilters`).
  The magazine hero stays page-1-only and only when NO filter is active (a filtered view is
  a plain grid — the hero means "the latest", not "first match").
- `PostCard` gains tag chips (up to 2, small badges above the title meta) — shared card, so
  home teaser shows them too; fixtures get `tags: []` + `author` nulls to satisfy the VM.

### 4. Copy (all new keys in `messages.blog` + one in `enquiryCta.headings`)

`bylineNamed(name)` · `toursHeading: 'Tours in this story'` · `topicsLabel: 'Topics'` ·
`allTag: 'All'` · `searchPlaceholder: 'Search the journal…'` · `searchLabel: 'Search articles'` ·
`emptyFilteredBody: 'Nothing matches that filter yet - clear it to see every story.'` ·
`clearFilters: 'Clear filters'` ·
`enquiryCta.headings.blog: (title: string) => ...` (mirrors existing tour heading function).

## Out of scope

Prev/next, share, scrollspy, progress bar, updatedAt (Wave 4) · admin changes · BE changes ·
RSS/newsletter (Wave 5) · multi-tag filtering (single `?tag=` only).

## Testing & process

- TDD: post-vm extensions + `pickMorePosts` helper. Layout via build gate + user review on
  deploy. Web baseline 148 → grows.
- FE-only slice(s) → per-task reviews, no ecc pass; final whole-branch review before merge.
- Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. api 301 / admin 139
  untouched.
- SDD: haiku transcription / sonnet reviewers. Straight quotes; no unrelated staging.

## Risks

- **Deploy-lag:** Render already serves Wave 1 fields (merged first), but every new field
  access still guards `?? []`/`?? null` — the established rule.
- **`/blog/[slug]` build-time related fetches:** two extra `fetchPosts` calls per page at
  SSG; both error-tolerant. ISR keeps them fresh.
- **Search + tag combined:** BE ANDs `search` and `tag` — the UI must preserve both in
  links/form (hidden inputs / query merges) or one silently drops the other.

## Success criteria

An article shows its real author, its topics, up to 3 hand-picked tours (cards → booking
funnel), and an enquiry CTA; "More from the journal" prefers same-topic stories; `/blog`
filters by topic chip and free-text search with honest filtered-empty states. Zero BE
change; gates green.
