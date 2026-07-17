# Tour reviews clamp + modal — implementation plan

**Spec:** [`docs/06-specs/2026-07-17-tour-reviews-clamp-modal-design.md`](../06-specs/2026-07-17-tour-reviews-clamp-modal-design.md)
**Branch:** `feat/tour-reviews-clamp-modal` · **Date:** 2026-07-17

## STATUS

- [x] T0 context7 confirm — Base UI `Dialog.Root` takes `open`/`onOpenChange`
  (controlled); our wrapper exports Dialog/DialogTrigger/DialogContent/
  DialogHeader/DialogTitle/DialogDescription/DialogClose; web precedents:
  `danger-zone.tsx`, `booking-actions.tsx`.
- [x] T1 pure logic `reviews-pager.ts` (TDD) + client-safe `review-mapper.ts` extraction
- [x] T2 i18n `reviewsSection` keys
- [x] T3 `ReviewCard` client (clamp + measured truncation + Read-more dialog) + tests
- [x] T4 `SeeAllReviews` client (dialog + browser API paging) + tests
- [x] T5 wire `tour-reviews.tsx` server shell (slice 6 + client pieces)
- [x] T6 gate + review

**RESUME STATE:** all code tasks done on `feat/tour-reviews-clamp-modal`; gate
GREEN (web **366** — +21 over the 345 baseline; i18n 1; build includes
`/tours/[slug]` unchanged). Code review: 1 CRITICAL finding FIXED — the
see-all first-open effect had `loading` in its deps while `fetchedPages` stays 0
on failure → a failed page 1 auto-retried in an unbounded loop; replaced with a
synchronously-set `requestedRef` guard (`[open]` deps) so the auto-fetch fires
at most once per mount and "Load more" is the only retry path (+ regression
test asserting exactly one API call after a failed first page). Lint gotcha:
`react-hooks/exhaustive-deps` is NOT registered in this repo's eslint config —
any eslint-disable referencing it ERRORS ("definition not found"); don't write
one. **Implementation not yet committed — awaiting user review before
commit + merge.** Post-merge: rule-9 docs sweep + verify on Vercel (long-review
tour → clamp + Read more; >9-review tour → See all + Load more).

## Sequencing

T0 → T1 → T2 → T3/T4 (parallel, both consume T1+T2) → T5 → T6.

## Reused seams

- `Dialog`/`DialogContent`/`DialogTitle`/`DialogTrigger` from `@tourism/ui`
  (Base UI `base-nova`; barrel already exports them).
- `createApiClient` (`@tourism/core`) + `NEXT_PUBLIC_API_BASE_URL` — same
  browser-side pattern as the chat panel; `lib/api/client.ts#getApiClient` is
  client-importable (no `server-only`).
- Component-test conventions: co-located `*.spec.tsx`, `@tourism/ui` barrel
  mock (see `password-field.spec.tsx`), jsdom + `jest.setup.ts`.
- Card/star markup stays from the current `tour-reviews.tsx` (tokens only).
- `tourTag`/tagged fetch in `tour-detail.ts` — untouched (revalidation seam).

## Tasks

### T0 — context7: Base UI Dialog

Confirm controlled/uncontrolled `Dialog` usage (Root open/onOpenChange, Popup,
Title) as wrapped by `libs/web/ui/src/components/ui/dialog.tsx`, and any
Next 16 client-component caveat for `ResizeObserver` effects. Record in RESUME
STATE. No writing from memory.

### T1 — pure logic + mapper extraction (test-first)

1. `apps/web/src/lib/reviews-pager.spec.ts` FIRST: `shouldShowSeeAll` (7>6 true,
   6>6 false, NaN/negative false) · `appendReviewPage` (append, dedupe by id,
   empty next) · `hasMoreReviews` (1<2 true, 2<2 false, 0/NaN guards) ·
   `isClamped` (gt true, eq/lt false). Then `reviews-pager.ts` (green) with
   `MAX_INLINE_REVIEWS = 6`, `REVIEWS_PAGE_SIZE = 9`.
2. Extract `toTourReview` + `formatReviewDate` into
   `apps/web/src/lib/api/review-mapper.ts` (client-safe, no `react` import);
   `tour-detail.ts` imports them (no behaviour change). `review-mapper.spec.ts`:
   mapping + invalid-date → `''`.

**Accept:** `pnpm nx test @tourism/web` green; `tour-detail` compiles unchanged.

### T2 — i18n keys

`messages.tourDetail.reviewsSection` += `readMore`, `seeAll: (count) => …`,
`dialogTitle`, `listDialogTitle`, `loadMore`, `loading`, `loadError`.

**Accept:** typecheck green.

### T3 — `ReviewCard` (client)

`components/tours/review-card.tsx`: renders the existing card markup;
quote `<p className="line-clamp-5">`; `ref` + `useEffect` + `ResizeObserver`
calling `isClamped(el.scrollHeight, el.clientHeight)` → state `truncated`;
"Read more" `<Button variant="link">` rendered only when truncated → controlled
`Dialog` (stars + full quote + author + date + verified). `review-card.spec.tsx`
(barrel mock incl. Dialog primitives): clamp class present; button hidden when
metrics equal; shown when scrollHeight > clientHeight (defineProperty on the
element); click → full quote visible.

**Accept:** web tests green.

### T4 — `SeeAllReviews` (client)

`components/tours/see-all-reviews.tsx`: props `{ slug, reviewCount, initial:
TourReview[] }`. Button `seeAll(reviewCount)`; controlled `Dialog` with
scrollable list (same card layout, no clamp OR clamp+read-more reuse —
**full text, no clamp, in the list**); state `{ items, page, totalPages,
loading, error }` seeded from `initial`; on open fetch page 1 (pageSize 9) via
`getApiClient().GET('/api/v1/tours/{slug}/reviews', …)` → map with
`toTourReview` → `appendReviewPage`; "Load more" while
`hasMoreReviews(page, totalPages)`; failure → `loadError` line, button stays.
`see-all-reviews.spec.tsx`: trigger label; open fetches + renders; load-more
appends (2 pages, dedupe); error path.

**Accept:** web tests green.

### T5 — wire the server shell

`tour-reviews.tsx` (stays server): keep heading/badge/grid; render
`reviews.slice(0, MAX_INLINE_REVIEWS)` as `<ReviewCard>`; after the grid render
`<SeeAllReviews>` when `shouldShowSeeAll(reviewCount, MAX_INLINE_REVIEWS)`,
passing the sliced initial items. No fetch changes.

**Accept:** typecheck + tests green; page builds (`ƒ`/`●` unchanged for
`/tours/[slug]`).

### T6 — gate + review

Kill orphan node; `pnpm nx run-many -t lint typecheck test build -p
@tourism/web @tourism/i18n`. `superpowers:requesting-code-review` pass
(client/server boundary, a11y, paging dedupe). Report web test delta
(baseline 345). **STOP before merge.**

## Post-merge (rule 9)

CHANGELOG entry · CLAUDE.md web row · HANDOFF · `frontend.md` `/tours/[slug]`
row (reviews clamp/modal note) · roadmap P3 cell. Verify on Vercel preview with
a long-review tour + a >9-review tour (seed if needed).
