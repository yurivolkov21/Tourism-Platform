# Blog v2 Wave 4 — reader polish + P6 fast-follows

- **Date:** 2026-07-05
- **Roadmap:** `docs/07-plans/2026-07-03-blog-v2-roadmap.md` (Wave 4 of 5)
- **Scope:** web FE only (`apps/web` + `@tourism/i18n` copy). Zero schema, zero BE, zero
  regen — `updatedAt` already ships on the public `PostDto`/`PostDetailDto` (verified in
  `libs/shared/core/src/lib/api/schema.ts`).
- **User decisions (2026-07-05):**
  - The Wave-3 BE fast-follow (`registerAsset` unique index — needs a migration) is
    **deferred to Wave 5** (rides Wave 5's `Subscriber` migration go/no-go). Wave 4 stays
    FE-only.
  - "Updated on …" shows when `updatedAt` post-dates `publishedAt` by **more than 24 h**.

## Goal

The `/blog/[slug]` article becomes a polished read: prev/next navigation, a share row
(copy link + Facebook + X, no SDKs), an outline rail that highlights the active section,
a top scroll-progress bar, and an honest "Updated on …" stamp — plus the two P6
fast-follows that live in the same files (outline-anchor markdown mismatch,
`stripMarkdownSyntax` DRY).

## Verified facts

- **Outline-anchor bug root cause:** rendered heading ids come from
  `slugifyHeading(headingText(children))` in `components/blog/post-content.tsx` —
  `headingText` flattens the *rendered* children (a link contributes only its text, an
  image contributes nothing). `extractOutline` (`lib/blog/derive.ts`) slugifies the *raw
  markdown* line, so `## See [Hạ Long](https://…)` produces an id containing `https` that
  no rendered heading carries → the rail link misses. The rail also *displays* the raw
  markdown. Fix = strip inline markdown in `extractOutline` (both `text` and `id`),
  mirroring what react-markdown renders; `slugifyHeading` itself is untouched (already
  shared by both sides).
- **Strip-chain duplication:** `readingStats` (`lib/blog/derive.ts`) and `fallbackExcerpt`
  (`lib/blog/post-vm.ts`) carry byte-identical 4-step regex chains (fences → images →
  links→text → syntax chars). Extract once.
- `ScrollProgress` exists in `@tourism/ui` (`'use client'`, fixed top-of-viewport bar,
  whole-page `useScroll`) and is mounted at page level by `apps/web/src/app/tours/[slug]/page.tsx:91`.
- The outline rail is server-rendered inline in `app/blog/[slug]/page.tsx` (sticky aside on
  desktop, order-first list on mobile). Scrollspy needs a client component — extract the
  rail, keep the server page computing the items.
- Public list API is newest-first; `fetchPostSlugs()` already pulls up to 100 summaries via
  `fetchPosts({ pageSize: 100 })` — prev/next neighbors derive from the same call (ISR,
  revalidate 300, no new endpoint).
- `lib/site.ts` provides `absoluteUrl()` (server-side env resolution) — the share row is a
  client component, so the page passes the absolute article URL down as a prop.
- Copy lives in `messages.blog` (`@tourism/i18n`) — EN-only (ADR-0005).
- `PostDetailVM` (`lib/blog/post-vm.ts`) doesn't expose `updatedAt` yet; the DTO does.

## Design

### 1. Shared markdown stripping (fast-follow, foundation)

New `apps/web/src/lib/blog/strip-markdown.ts` (pure, TDD):

- `stripInlineMarkdown(text)` — single-line inline strip matching what react-markdown
  renders as heading text: images removed, `[text](url)` → `text`, `` `code` `` → `code`,
  `**`/`*`/`__`/`_`/`~~` emphasis markers removed. Used by `extractOutline`.
- `stripMarkdownSyntax(content)` — the existing doc-level chain (fenced code blocks → ` `,
  images → ` `, links → their text, `[#>*_~\`|-]+` → ` `), extracted verbatim. Used by
  `readingStats` and `fallbackExcerpt` (which keeps its own whitespace-collapse + clamp).

`derive.ts` and `post-vm.ts` re-export nothing; they import. Existing specs
(`derive.spec.ts`, `post-vm.spec.ts`) are the regression net; new cases cover headings
with links/inline code (outline `text` + `id` now match the rendered heading).

### 2. "Updated on …" (header meta)

- `PostDetailVM` += `updatedAt: string | null` (deploy-lag guard `dto.updatedAt ?? null`).
- Pure helper `isMeaningfullyUpdated(publishedAt, updatedAt)` in `derive.ts` (TDD):
  true iff both dates parse and `updatedAt - publishedAt > 24 h`.
- Header meta row (`app/blog/[slug]/page.tsx`) gains a fourth item when true:
  `RefreshCwIcon` + `t.updatedOn(dateFmt.format(new Date(updatedAt)))`.

### 3. Prev/next navigation (article end)

- Pure helper `pickAdjacentPosts(posts, slug)` in new `lib/blog/adjacent.ts` (TDD):
  `posts` is the newest-first summary list; returns `{ newer, older }`
  (`PostSummaryVM | null` each) — `newer` = the entry just before the current slug,
  `older` = just after; both null when the slug is absent (deploy edge: >100 posts).
- Page fetches `fetchPosts({ pageSize: 100 }).catch(() => null)` alongside the existing
  parallel fetches and renders `<PostNav newer older />` (new server component
  `components/blog/post-nav.tsx`) directly after the article body/outline grid, before
  "Tours in this story": a 2-up bordered grid, each cell a Link with a direction label
  (`t.newerStory` / `t.olderStory`, arrow icons) + post title, `line-clamp-2`. Cells render
  only when present; the whole block only when at least one exists.

### 4. Share row (under the body)

- New client component `components/blog/share-row.tsx`:
  `<ShareRow url title copyLabel copiedLabel …labels />` — or messages read directly from
  `@tourism/i18n` (it's importable client-side; the form components already do this).
  Buttons: **Copy link** (`navigator.clipboard.writeText`, swap label to "Link copied" for
  ~2 s, `aria-live="polite"`), **Facebook** (`https://www.facebook.com/sharer/sharer.php?u=<enc url>`),
  **X** (`https://x.com/intent/post?url=<enc>&text=<enc title>`) — plain anchors,
  `target="_blank" rel="noopener noreferrer"`, no SDKs. Icons: lucide `LinkIcon`/`Check` +
  `Facebook`/`Twitter` brand glyphs (lucide ships them; deprecated-but-present) — final
  icon choice at implementation, tokens only.
- Placement: a labeled row (`t.shareLabel`) at the end of the article body column (below
  `PostContent`, inside the grid's main column so the rail stays beside it).
- The server page passes `absoluteUrl('/blog/' + slug)`.

### 5. Outline rail scrollspy + scroll progress

- Extract the existing rail JSX into `components/blog/outline-rail.tsx` (`'use client'`),
  props `{ items: OutlineItem[]; heading: string }` — markup/classes unchanged, plus:
  `IntersectionObserver` over `items.map(i => document.getElementById(i.id))` (guarded,
  effect-only; rootMargin ≈ `-96px 0px -66% 0px` so "active" = heading in the top third),
  active item gets `text-primary font-medium` + `aria-current="true"`; observer cleans up
  on unmount. No observer → no highlight (progressive enhancement).
- Mount `<ScrollProgress />` at the top of the article page (same pattern as tour detail).

### 6. i18n additions (`messages.blog`, EN-only)

`updatedOn: (date: string) => 'Updated ' + date` · `shareLabel: 'Share this story'` ·
`copyLink: 'Copy link'` · `linkCopied: 'Link copied'` · `shareOnFacebook: 'Share on Facebook'` ·
`shareOnX: 'Share on X'` · `newerStory: 'Newer story'` · `olderStory: 'Older story'`.

## Out of scope

`registerAsset` unique index (Wave 5) · share SDKs/counters · comments · scroll-linked
reading-time remaining · admin changes · any BE/schema change.

## Testing & process

- TDD (spec-first) on all pure logic: `strip-markdown.spec.ts` (new),
  `derive.spec.ts` (outline link/code cases + `isMeaningfullyUpdated`),
  `post-vm.spec.ts` (fallbackExcerpt regression via shared strip, `updatedAt` mapping),
  `adjacent.spec.ts` (new). Components (`ShareRow`, `OutlineRail`, `PostNav`) are
  layout/browser-API — covered by build + live deploy review, matching the repo's split.
- Web test baseline **155** grows; api 309 / admin 142 untouched.
- Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.
- Single slice, branch `feat/blog-v2-wave4-reader-polish`; merge = rebase + `--ff-only`
  after user review (user-gated).

## Planned files

| Action | File |
| --- | --- |
| Create | `apps/web/src/lib/blog/strip-markdown.ts` + `.spec.ts` |
| Create | `apps/web/src/lib/blog/adjacent.ts` + `.spec.ts` |
| Create | `apps/web/src/components/blog/share-row.tsx` |
| Create | `apps/web/src/components/blog/outline-rail.tsx` |
| Create | `apps/web/src/components/blog/post-nav.tsx` |
| Modify | `apps/web/src/lib/blog/derive.ts` (+ spec) — import strips, outline fix, `isMeaningfullyUpdated` |
| Modify | `apps/web/src/lib/blog/post-vm.ts` (+ spec) — shared strip, `updatedAt` |
| Modify | `apps/web/src/app/blog/[slug]/page.tsx` — ScrollProgress, updated-on, ShareRow, PostNav, OutlineRail swap, adjacent fetch |
| Modify | `libs/shared/i18n/src/lib/messages.ts` — `messages.blog` keys above |

## Risks

- **Anchor ids change** for headings that contain links/code (they were broken anyway —
  that's the fix). Plain-text headings keep identical ids (`slugifyHeading` untouched).
- `navigator.clipboard` needs a secure context — fine on the Vercel deploy + localhost;
  guard with a `try`/fallback (no crash, button just doesn't confirm).
- `IntersectionObserver` is client/effect-only; SSR renders the rail identically to today
  (no hydration mismatch — highlight is state-driven post-mount).
- Prev/next sees only the newest 100 posts (same ceiling as `generateStaticParams`) —
  acceptable at current content volume; helper returns nulls gracefully beyond it.
