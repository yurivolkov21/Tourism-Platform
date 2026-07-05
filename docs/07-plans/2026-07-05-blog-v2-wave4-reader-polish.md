# Blog v2 Wave 4 — reader polish implementation plan

**Goal:** ship the `/blog/[slug]` polish set (prev/next, share row, scrollspy +
scroll-progress, updated-on) + the two P6 fast-follows (outline-anchor markdown fix,
`stripMarkdownSyntax` DRY) as ONE web-only slice.

**Spec:** `docs/06-specs/2026-07-05-blog-v2-wave4-reader-polish-design.md` (read first —
it holds the verified facts + user decisions).

**Branch:** `feat/blog-v2-wave4-reader-polish` (already cut from `main`).

## Global constraints

- Web FE only — NO schema/BE/regen. Baselines: api 309 · admin 142 · web **155**.
- TDD on pure logic (Tasks 1–3): failing spec → implement → green, per case.
- Theme tokens only (no hex), reuse `@tourism/ui`, copy via `messages.blog` (EN-only,
  ADR-0005).
- Never reformat lines a task doesn't name; straight ASCII quotes.
- Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.
- Merge is user-gated: STOP after the gate for source review; then rebase + `--ff-only`.

## Reused seams

`slugifyHeading`/`extractOutline`/`readingStats` (`lib/blog/derive.ts`) ·
`fallbackExcerpt`/`PostDetailVM` (`lib/blog/post-vm.ts`) · `fetchPosts` 100-page list
(`lib/api/posts.ts`) · `absoluteUrl` (`lib/site.ts`) · `ScrollProgress` (`@tourism/ui`,
mounted like `app/tours/[slug]/page.tsx:91`) · outline rail JSX (moves verbatim into the
client component) · `dateFmt` long-date formatter (article page) · lucide icons.

## Tasks (dependency order)

### Task 1 — `strip-markdown.ts` (TDD)

Create `apps/web/src/lib/blog/strip-markdown.ts` + `strip-markdown.spec.ts`.

- [ ] Failing specs: `stripInlineMarkdown` — link → text · image removed · inline code →
  content · `**`/`_`/`~~` markers removed · plain text unchanged. `stripMarkdownSyntax` —
  fences/images/links/syntax chars (port the exact expectations the `readingStats` +
  `fallbackExcerpt` specs imply today).
- [ ] Implement both (spec §1: `stripMarkdownSyntax` is the existing 4-step chain
  extracted verbatim).
- [ ] **Accept:** `pnpm nx test @tourism/web --testPathPatterns="strip-markdown"` green.

### Task 2 — wire the strips: outline fix + DRY (TDD)

Modify `lib/blog/derive.ts` (+spec) and `lib/blog/post-vm.ts` (+spec).

- [ ] Failing derive cases: heading `## See [Hạ Long](https://example.com)` → outline
  `text: 'See Hạ Long'`, `id: 'see-ha-long'`; heading with `` `inline code` `` → code text
  in `text`/`id`. Failing post-vm case: excerpt derived from content with a link keeps
  only the link text (already true — keep as regression pin).
- [ ] `extractOutline`: `const text = stripInlineMarkdown(m[2].trim())` (id from the same
  text). `readingStats` + `fallbackExcerpt`: replace inline chains with
  `stripMarkdownSyntax(content)`.
- [ ] **Accept:** `pnpm nx test @tourism/web --testPathPatterns="derive|post-vm"` green,
  zero pre-existing case edits (only additions).

### Task 3 — `updatedAt` + `isMeaningfullyUpdated` + `pickAdjacentPosts` (TDD)

- [ ] `PostDetailVM` += `updatedAt: string | null` (`dto.updatedAt ?? null`); spec case.
- [ ] `isMeaningfullyUpdated(publishedAt, updatedAt)` in `derive.ts` (spec §2, >24 h;
  false on null/unparsable). Failing specs: 25 h later → true · 2 h later → false ·
  null publishedAt → false · garbage dates → false.
- [ ] Create `lib/blog/adjacent.ts` + spec: `pickAdjacentPosts(posts, slug)` →
  `{ newer, older }` (spec §3). Failing specs: middle slug → both · newest → newer null ·
  oldest → older null · absent slug → both null · empty list → both null.
- [ ] **Accept:** `pnpm nx test @tourism/web` green, count > 155.

### Task 4 — components: `ShareRow` · `OutlineRail` · `PostNav`

- [ ] `components/blog/share-row.tsx` (`'use client'`, spec §4): copy-link with 2 s
  "Link copied" swap (`aria-live="polite"`, clipboard call in try/catch) + Facebook + X
  anchor buttons (`target="_blank" rel="noopener noreferrer"`, URL-encoded params).
- [ ] `components/blog/outline-rail.tsx` (`'use client'`, spec §5): move the aside/nav JSX
  from the article page verbatim; add IntersectionObserver scrollspy (effect-only,
  cleanup, `rootMargin` top-third), active link `text-primary font-medium` +
  `aria-current="true"`.
- [ ] `components/blog/post-nav.tsx` (server, spec §3): 2-up bordered grid of
  newer/older links (direction label + clamped title); renders null when both absent.
- [ ] i18n: add the 8 `messages.blog` keys (spec §6).
- [ ] **Accept:** `pnpm nx run-many -t lint build -p @tourism/web @tourism/i18n` green.

### Task 5 — article page wiring

Modify `app/blog/[slug]/page.tsx`:

- [ ] `<ScrollProgress />` first child of `<main>`; import from `@tourism/ui`.
- [ ] Header meta: updated-on item when `isMeaningfullyUpdated(post.publishedAt, post.updatedAt)`.
- [ ] Add `fetchPosts({ pageSize: 100 }).catch(() => null)` to the existing
  `Promise.all`, derive `{ newer, older }` via `pickAdjacentPosts`.
- [ ] Swap the inline aside for `<OutlineRail items={outline} heading={t.outlineHeading} />`;
  append `<ShareRow url={absoluteUrl('/blog/' + slug)} title={post.title} />` at the end
  of the body column; `<PostNav newer={newer} older={older} />` after the body grid,
  before the tours section.
- [ ] **Accept:** `pnpm nx run-many -t lint test build -p @tourism/web` green.

### Task 6 — gate + STOP (user review) + merge + docs

- [ ] Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.
- [ ] **⛔ STOP — user source review.** On approval: rebase + `git merge --ff-only` →
  push → delete branch.
- [ ] Docs: this plan's STATUS · roadmap STATUS + RESUME STATE (Wave 4 done → Wave 5
  next) · CLAUDE.md web row · memory.

**Sequencing:** 1 → 2 → 3 are strictly ordered (each builds on the last); 4 depends on 3
(i18n keys + helpers); 5 depends on 4; 6 last. No parallel slices — one branch, commits
per task (`feat(web): …` / `feat(i18n): …` folded into the task commit that uses it).

## STATUS

- [x] Tasks 1–6 — **DONE**, merged `b9b5158` fast-forward (2026-07-05, user-reviewed).
  web **175** tests (155 + 20). Deviations: ShareRow uses the repo's own
  `components/icons/social.tsx` glyphs (lucide-react 1.21 removed brand icons — the
  spec's `Facebook`/`Twitter` imports fail typecheck); one extra i18n key
  (`postNavLabel`) for the prev/next nav aria-label.
