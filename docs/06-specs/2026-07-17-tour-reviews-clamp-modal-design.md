# Tour reviews: clamp + full-review modal + see-all pagination — design spec

**Date:** 2026-07-17 · **Scope:** `@tourism/web` + `@tourism/i18n` · **Status:** APPROVED (design signed off 2026-07-17)

## Goal

Make the "Traveller reviews" section on `/tours/[slug]` layout-stable regardless
of review length or count: long reviews are clamped with an ellipsis, every card
in a row is the same height, at most six cards render inline, a per-card
"Read more" opens the full review in a dialog, and a "See all {N} reviews"
dialog pages through EVERY approved review via the existing public API.

## Problem (investigated — confirmed)

1. `apps/web/src/components/tours/tour-reviews.tsx` renders `{review.quote}`
   with no line limit (L64) → a long review stretches its card.
2. Amplified by layout: the `md:grid-cols-3` grid + `h-full` cards (L42–44)
   stretch every card in a row to the tallest one.
3. Inline data is capped at 9 by `fetchTourReviews` (`pageSize: 9`,
   `apps/web/src/lib/api/tour-detail.ts` L112–123) with no way to see more; the
   "(N)" badge comes from the DTO's total `reviewsCount`, so badge vs cards can
   disagree.

## Locked decisions

1. **Clamp** the quote with Tailwind `line-clamp-5` (browser adds the `…`).
2. **Cap inline cards** at `MAX_INLINE_REVIEWS = 6` (grid unchanged; slice in
   the server component). The inline fetch stays `pageSize: 9` + tagged
   `next: { tags: [tourTag(slug)] }` — do NOT touch the revalidation seam.
3. **"Read more" per card only when actually truncated** — measured via ref
   (`scrollHeight > clientHeight`), re-checked on resize (`ResizeObserver`);
   never guessed from string length. Opens a `Dialog` with the full review
   (stars + full quote + author + date + "Verified traveller").
4. **"See all {N} reviews"** shows when `reviewCount > MAX_INLINE_REVIEWS`;
   opens a `Dialog` with a scrollable list that pages through
   `GET /api/v1/tours/{slug}/reviews?page=N&pageSize=9` **browser-side** (the
   browser→API pattern is established: chat panel, newsletter; CORS covers the
   web origin). "Load more" appends pages; PII-stripped shape preserved.
5. **`Dialog` from `@tourism/ui`** (Base UI — focus trap, Esc, portal). Sheet
   remains a one-line swap later if wanted.
6. **Unchanged:** server-side approved-only filtering; `return null` empty
   state; tokens-only styling; every string via `@tourism/i18n`.

## Architecture (Next.js 16 server/client boundary)

```
TourReviews (SERVER — section shell, heading, badge, grid)
 ├─ slices reviews.slice(0, MAX_INLINE_REVIEWS)
 ├─ <ReviewCard review={r} />            ('use client')
 │    line-clamp-5 quote · truncation ref/effect · "Read more" → Dialog(full review)
 └─ <SeeAllReviews slug count initial /> ('use client', rendered only when count > 6)
      "See all {N} reviews" button → Dialog(scrollable list)
        pages via createApiClient (NEXT_PUBLIC_API_BASE_URL) · "Load more" while hasMore
```

- `toTourReview` + `formatReviewDate` currently live in
  `apps/web/src/lib/api/tour-detail.ts`, which imports React `cache`
  (server-only) — they move to a **client-safe module**
  `apps/web/src/lib/api/review-mapper.ts`; `tour-detail.ts` re-imports from it
  (no behaviour change).

## Pure logic (TDD) — `apps/web/src/lib/reviews-pager.ts`

| Function | Contract |
| --- | --- |
| `shouldShowSeeAll(reviewCount, inlineCount)` | `true` iff `reviewCount > inlineCount` (non-finite/negative → false). |
| `appendReviewPage(existing, next)` | Concat, de-duped by `id` (a re-fetched page must not duplicate cards). |
| `hasMoreReviews(page, totalPages)` | `true` iff `page < totalPages` (guards bad meta). |
| `isClamped(scrollHeight, clientHeight)` | `true` iff `scrollHeight > clientHeight` (the ref effect calls this — testable without a DOM). |

`MAX_INLINE_REVIEWS = 6` and the modal `PAGE_SIZE = 9` live here as named
constants.

## i18n — `messages.tourDetail.reviewsSection` (EN-only)

`readMore` · `seeAll: (count) => 'See all N reviews'` · `dialogTitle`
("Traveller review") · `listDialogTitle` ("All reviews") · `loadMore` ·
`loading` · `loadError` (friendly retry line). Existing `heading`/`verified`
unchanged.

## Error handling

- Modal page fetch failure → keep already-loaded items, show `loadError` +
  keep the "Load more" button usable (retry).
- The dialog list seeds from the already-fetched inline reviews (page 1 subset)
  so it opens instantly; page fetches then replace/extend via
  `appendReviewPage` dedupe.

## Testing

- `reviews-pager.spec.ts` (test-first): all four functions incl. dedupe and
  boundary cases.
- `review-mapper.spec.ts`: `toTourReview` mapping + graceful bad date.
- `review-card.spec.tsx` (barrel mock): quote clamped class present; "Read
  more" hidden when not truncated, shown when truncated (mock
  `scrollHeight`/`clientHeight` on the ref element); clicking opens the dialog
  with the full quote.
- `see-all-reviews.spec.tsx`: renders trigger with count; opens dialog; "Load
  more" appends the next page (mock API client); error path shows `loadError`.
- Visual/layout via the Vercel preview (repo rule: no local dev-server review).

## Acceptance criteria

1. Long reviews no longer stretch rows; equal-height cards with `…`.
2. Adding reviews never changes the section layout (inline cap 6).
3. "Read more" appears only on actually-truncated cards; dialog shows that
   review in full.
4. "See all {N}" pages through ALL approved reviews (beyond 9) via the API.
5. A11y: real buttons; dialogs have a title, focus trap, Esc-close (Base UI);
   star ratings keep their `aria-label`. `/gate` green; truncation + paging
   logic unit-tested.

## Planned files

| File | Change |
| --- | --- |
| `apps/web/src/lib/reviews-pager.ts` (+ `.spec.ts`) | new — pure logic (TDD) |
| `apps/web/src/lib/api/review-mapper.ts` (+ `.spec.ts`) | new — client-safe `toTourReview`/`formatReviewDate` (moved) |
| `apps/web/src/lib/api/tour-detail.ts` | import mapper from the new module |
| `apps/web/src/components/tours/review-card.tsx` (+ `.spec.tsx`) | new client — clamp + truncation + Read-more dialog |
| `apps/web/src/components/tours/see-all-reviews.tsx` (+ `.spec.tsx`) | new client — see-all dialog + API paging |
| `apps/web/src/components/tours/tour-reviews.tsx` | server shell: slice 6, render the client pieces |
| `libs/shared/i18n/src/lib/messages.ts` | new `reviewsSection` keys |
| `docs/CHANGELOG.md` + touched reference docs | docs sweep on merge (rule 9) |

## Risks

- **jsdom can't measure layout** → truncation logic isolated in `isClamped`
  (pure) + component test drives it by mocking element metrics.
- **Browser→API CORS**: already configured for the web origin (chat/newsletter
  precedent); modal fetch reuses `createApiClient` with
  `NEXT_PUBLIC_API_BASE_URL`.
- **Base UI Dialog is post-training** → context7 lookup before writing the
  dialog usage (repo rule).
