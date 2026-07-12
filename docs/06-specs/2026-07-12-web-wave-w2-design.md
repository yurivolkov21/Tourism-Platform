# Web wave W2 — resilience layer (loading · error · 404 · empty-vs-failed) — design spec

**Date:** 2026-07-12 · **Scope:** apps/web + @tourism/i18n (NO BE changes) ·
**Status:** ✅ **done** — merged 2026-07-12 (`afbc163…1d7fc24`); gate green (web
252 tests), adversarial review clean. web debt program W1 ✅ · W2 ✅ → next W3.

## Problem

`apps/web` ships **zero** `loading.tsx` / `error.tsx` / `not-found.tsx` /
`global-error.tsx`. Two failure modes result:

1. **Silent blank / lying empty.** Every data-fed page swallows API errors with
   `.catch(() => [])` / `.catch(() => null)` (home `page.tsx:29-35`,
   `tours/page.tsx:30-34`, `destinations/page.tsx:47-48`, `about/page.tsx:27`,
   …). The swallow is **deliberate** (it absorbs Render cold-starts so a sleepy
   API never fails the page) and stays. But an outage is then
   **indistinguishable from a real empty result** — `tours` and `destinations`
   render their "no results" empty state during an API outage, which *lies*.
2. **Ugly framework defaults.** `notFound()` in tour/blog/region detail pages
   renders Next.js's default 404; an uncaught throw renders the default error
   overlay — both off-brand.

Admin already solved the loading half (13 `loading.tsx` +
`TableSkeleton`/`DashboardSkeleton` under `components/motion/`); the blog list
already hand-rolls the empty-vs-failed split
(`.then(ok).catch(fail)` → `failed ? loadError : empty`). W2 generalises both
across web.

## Resolved decisions (user, 2026-07-12)

- **Error-state placement — focused.** Apply the "couldn't load + retry" state
  only where a page actually goes blank or *lies*: **tours-list** and
  **destinations-list**. **Home is left untouched** — its hero + static sections
  (WhyChoose/Trust/Experiences/TrustBand) already prevent a blank page, and
  converting its swallow to `settle` with identical hide-on-fail behaviour is
  churn with no visible benefit. Blog-list is refactored onto the shared helper
  (and *gains* the retry button it currently lacks).
- **Skeleton granularity — list + detail (split).** `loading.tsx` applies to a
  segment **and its children** unless a child has its own, so a card-grid
  `tours/loading.tsx` would flash the wrong shape when navigating to
  `/tours/[slug]`. Detail routes get their own shape-matched skeletons.
- **Boundaries — minimal shared, plus one money-path exception.**
  `app/error.tsx` + `app/not-found.tsx` + `app/global-error.tsx`, all reusing
  one branded `ErrorState`. **Exception: `checkout/error.tsx`** — the money path
  gets a reassuring boundary ("your payment is safe, we're confirming…") rather
  than the generic message, because a generic error right after paying is the
  scariest failure on the site.

## Non-goals

- BE changes of any kind · per-section error banners on Home · touching Home's
  swallow at all · a `destinations/[region]/loading.tsx` (region pages are
  curated/light — YAGNI) · tailored `account/error.tsx` (root boundary covers
  it) · new dependencies · fixing the pre-existing `TrustBand`-shows-zeros cold
  path (noted as adjacent debt, out of scope) · dev-server/screenshot review.

## ① Pure logic (TDD first) — `apps/web/src/lib/resilience.ts`

Two tiny, isolated helpers with a red-first `resilience.spec.ts`:

- `settle<T>(promise: Promise<T>): Promise<Settled<T>>` where
  `Settled<T> = { ok: true; data: T } | { ok: false; data: null }`. Awaits the
  promise; on rejection returns `{ ok: false, data: null }` — **never throws**.
  Replaces the ad-hoc `.then(ok).catch(fail)` the blog inlines.
- `contentState(input: { failed: boolean; isEmpty: boolean }): 'error' | 'empty' | 'content'`
  — pure precedence helper. **`failed` wins over `isEmpty`**, so a page never
  shows a "no results" empty state during an outage. `content` when neither.

**Spec coverage:** `settle` resolves→`{ok:true,data}` · rejects→`{ok:false,data:null}`
· does not throw on rejection. `contentState` full matrix: failed+empty→error ·
failed+nonEmpty→error · ok+empty→empty · ok+nonEmpty→content. Target ≥80% on the
new module (it will be 100%).

## ② Error components (isolated, single-purpose)

`apps/web/src/components/feedback/` (joins the existing feedback layer):

- **`LoadErrorState`** (`'use client'`) — inline, **section-level** "couldn't
  load" panel. Muted card (`border-border/60 bg-muted/40`), `AlertCircleIcon`,
  title + body + a **Try again** button whose handler calls
  `useRouter().refresh()` (re-runs the RSC data fetch; a woken Render box then
  serves real data). Props: optional `title` / `body` (default to
  `messages.resilience.loadError.*`) so a surface can pass tailored copy. Tokens
  only. This is the component tours/destinations/blog render in the `error`
  branch.
- **`ErrorState`** (presentational, no client hook) — full-page **branded panel**
  for the route boundaries. Centered layout: heading (`font-heading`), body copy,
  and an **actions slot** (`children`) for the caller's buttons/links. Reused by
  `app/error.tsx` (reset + home), `app/not-found.tsx` (home/tours/blog links),
  `checkout/error.tsx` (reassurance + retry/account), and `global-error.tsx`.
  Buttons use `buttonVariants` from `@tourism/ui`.

## ③ Route files

### loading.tsx — shape-matched skeletons

New presentational skeletons in `apps/web/src/components/skeletons/`, each built
from `@tourism/ui` `Skeleton` (its `animate-pulse` is already neutralised for
`prefers-reduced-motion` by the `global.css` baseline — no extra guard needed).
Each `loading.tsx` is a one-line default export rendering its skeleton (mirrors
admin's pattern).

| File | Skeleton | Mirrors |
| --- | --- | --- |
| `tours/loading.tsx` | `ToursListingSkeleton` — search bar + toolbar + sidebar facet column + stacked list cards | `ContentHero` (static copy inline) + `ToursListing` |
| `tours/[slug]/loading.tsx` | `TourDetailSkeleton` — hero band + gallery + body column + sticky booking aside | `tours/[slug]/page.tsx` |
| `destinations/loading.tsx` | `DestinationsSkeleton` — hero + 1–2 region-group bands of card rows | `destinations/page.tsx` |
| `blog/loading.tsx` | `BlogListSkeleton` — heading + chip row + 3-col post-card grid | `blog/page.tsx` |
| `blog/[slug]/loading.tsx` | `ArticleSkeleton` — cover band + title + prose lines + outline rail | `blog/[slug]/page.tsx` |
| `account/loading.tsx` | `AccountSkeleton` — dashboard hero + stat tiles + upcoming rows | `account/page.tsx` (**force-dynamic → actually renders**) |
| `checkout/loading.tsx` | `CheckoutSkeleton` — centered result-card placeholder | `checkout/success` + `cancel` (**force-dynamic**) |

Highest real value: `account` + `checkout` (force-dynamic, render server-side on
every request; a cold API means a real wait). The detail skeletons earn their
keep on client-side navigation (correct shape vs. inheriting the list skeleton).

### Boundaries

- **`app/error.tsx`** (`'use client'`, required signature `{ error, reset }`) —
  `ErrorState` with `messages.resilience.error.*`; actions = **Try again**
  (`reset()`) + **Back home** link. Renders inside the root layout (header/footer
  stay).
- **`app/not-found.tsx`** — `ErrorState` with `messages.resilience.notFound.*`;
  actions = links to **home / tours / blog**. Upgrades every `notFound()` in
  tour/blog/region detail pages.
- **`app/global-error.tsx`** (`'use client'`, `{ error, reset }`) — replaces the
  **root layout**, so it renders its own `<html><body>` and imports
  `./global.css` (for tokens + the reduced-motion baseline). Self-contained
  `ErrorState` with `messages.resilience.globalError.*` + a reload/reset action.
  Last-resort screen; fonts/providers intentionally absent.
- **`checkout/error.tsx`** (`'use client'`, `{ error, reset }`) — money-path
  exception. `ErrorState` with `messages.resilience.checkoutError.*`
  (reassurance: payment captured/safe, we're confirming) + actions **Try again**
  (`reset()`) + **View my trips** (`/account`).

## ④ Empty-vs-failed wiring

Only the surfaces that go blank or lie. **tours** and **blog** carry a genuine
tri-state (`settle` → `contentState` → one of {error, empty, content}).
**destinations** is binary (`settle` → `error` branch only) — a real-empty tiles
set isn't a lie, it just renders the curated tail.

- **`tours/page.tsx`** — `const res = await settle(fetchTourCards())`. Below the
  always-rendered `ContentHero`: `contentState({failed:!res.ok, isEmpty:(res.data??[]).length===0})`
  → `error` renders `<LoadErrorState>` (tailored `messages.toursPage.loadError`);
  otherwise `<ToursListing tours={res.data ?? []}>` (its own filter-empty state
  is unchanged, and now only shows for a *real* empty catalogue). Replaces the
  current `try/catch`.
- **`destinations/page.tsx`** — `settle(fetchDestinationTiles())`. `DestinationsHero`
  always renders; on `failed` the **region-group + popular + gallery** region
  becomes `<LoadErrorState>` (generic `messages.resilience.loadError`); the
  curated tail (`BestTime` · `TravelTips` · `EnquiryCta`) still renders. The
  secondary `fetchTourCards({featured})` keeps its silent `.catch(()=>[])`
  (decorative shelf). `fetchFeaturedReviews` unchanged (its own fixture
  fallback).
- **`blog/page.tsx`** — swap the hand-rolled `{ ok }`/`{ failed }` for `settle` +
  render `<LoadErrorState>` in the `failed` branch (gaining the retry button).
  The `posts.length === 0` empty and pagination paths are unchanged. The
  `fetchPostTags().catch(()=>[])` secondary stays silent.
- **Home / About / region / account / etc. — untouched.** Their swallows stay as
  designed (static sections carry the page; region/account throw-or-fixture
  paths are already handled).

## ⑤ i18n (`@tourism/i18n`, EN-only, ADR-0005)

New top-level `resilience` group in `messages.ts`:

```ts
resilience: {
  loadError: { title, body, retry },        // LoadErrorState default (destinations, blog)
  error:      { title, body, retry, home },  // app/error.tsx
  notFound:   { title, body, home, tours, blog }, // app/not-found.tsx
  globalError:{ title, body, retry },        // app/global-error.tsx
  checkoutError: { title, body, retry, account }, // checkout/error.tsx (reassurance)
}
```

Plus a tailored `toursPage.loadError` (`{ title, body }`) so the tours surface
reads "We couldn't load our tours right now." rather than the generic string.
All copy warm/trust-forward, matching the Nexora voice. No hardcoded user-facing
strings in the new files.

## Error handling (of the resilience layer itself)

`settle` cannot throw. `LoadErrorState.refresh()` and boundary `reset()` are the
only actions; a repeated failure simply re-renders the same state (no loop, no
crash). `global-error` is the backstop for a root-layout throw.

## Testing (TDD on logic)

- `apps/web/src/lib/resilience.spec.ts` — new, red-first (`settle` + `contentState`).
- Existing **247** web specs stay green (no logic touched in tours/blog/destinations
  besides swapping the swallow mechanism — mapped data is identical).
- Skeletons + boundaries + `LoadErrorState`/`ErrorState` are presentational →
  covered by visual/e2e per CLAUDE.md #4, not unit-tested.
- `pnpm nx affected -t lint typecheck test build --base=main` + `pnpm format:check`
  green; adversarial review before commit.

## Definition of done

Navigating to `/tours` or `/destinations` during an API outage shows a branded
"couldn't load — try again" state (not a lying "no results"); a bad slug shows a
branded 404; an uncaught throw shows a branded error boundary (reassurance copy
on `/checkout`); every listed route streams a shape-correct skeleton while its
data resolves; `resilience.ts` is TDD'd; gate green; changelog entry + docs
sweep (frontend.md routes/components · CLAUDE.md web row · HANDOFF next-actions).
