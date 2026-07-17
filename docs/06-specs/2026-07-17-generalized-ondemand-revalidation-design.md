# Generalized On-Demand Revalidation · design spec

**Date:** 2026-07-17 · **Branch:** `feat/generalized-ondemand-revalidation`
**Refs:** existing per-tour revalidation (`apps/web/src/app/api/revalidate/route.ts`,
`apps/api/src/modules/reviews/web-revalidation.service.ts`, `apps/web/src/lib/revalidate.ts`) ·
review→revalidation design ([../06-specs/2026-07-16-review-ondemand-revalidation-design.md](2026-07-16-review-ondemand-revalidation-design.md)) ·
caching audit (§Background).

## Goal

Make public web content reflect a content/admin mutation **within seconds**, by
busting the exact Next.js cache tag from the **API** (the single write choke
point) the moment data changes — instead of waiting on passive ISR timers (today:
up to 300s on most pages, 3600s on the footer, and *never* on the blog list).
ISR timers stay in place as a **backstop**, not the primary freshness mechanism.
Authenticated/dynamic surfaces (`/account/*`, checkout, booking) are unchanged.

## Background — what depends on the timer today (audit)

The web already has an on-demand path, but it is wired to **exactly one** mutation
(review approval → `tour:<slug>`). Everything else public is timer-only:

- **300s ISR:** homepage (Hero + Trust + Testimonials + Experiences + Why-choose
  + CTA + blog teaser), `/tours` + cards, `/tours/[slug]` (for every edit *other*
  than reviews), `/destinations` + region pages, `/about`, `/blog/[slug]`.
- **Untagged 300s fetches:** `getSiteMedia` (Appearance/brand chrome — hero image
  included), `fetchFeaturedReviews` (testimonials), `fetchTrustStats`,
  `fetchTourCards`, `fetchDestinationTiles`, `fetchPosts`/`fetchPost`.
- **3600s:** `fetchActiveCategories` (footer "Browse tours").
- **No `revalidate` at all → static-until-redeploy:** `/blog` list page
  (`apps/web/src/app/blog/page.tsx`) + tag chips — **new posts never appear**
  without a deploy. Sharpest gap.
- **Already dynamic (fine, leave alone):** `/account/*`, `/checkout/*`,
  `/tours/[slug]/book` (`force-dynamic`); all `authedJson` reads (`no-store`).

Key existing assets to reuse (don't rebuild): the web `POST /api/revalidate`
route (secret-guarded), the API `WebRevalidationService` (fire-and-forget POST to
`${FRONTEND_URL}/api/revalidate`), and `lib/revalidate.ts` (`tourTag`).

## Tag taxonomy (single source in `apps/web/src/lib/revalidate.ts`)

| Tag | Covers | Busted when |
| --- | --- | --- |
| `site-media` | Appearance / brand chrome (all slots) | a site-media slot is saved/cleared |
| `tours` | tours list, cards, counts, homepage featured | any tour create/update/publish/unpublish/delete |
| `tour:<slug>` | tour detail DTO + reviews | that tour edits; its departures; its reviews (approve/unapprove — existing) |
| `destinations` | destinations tiles + region pages + counts | destination create/update/delete |
| `posts` | blog list + tag chips | post create/update/publish/unpublish/delete |
| `post:<slug>` | post detail | that post edits |
| `categories` | footer "Browse tours" | category create/update/delete |
| `featured-reviews` | homepage testimonials | review setFeatured/unfeature |
| `trust-stats` | homepage trust band (avg rating, counts) | review approve/unapprove; tour publish/unpublish |

Keep the taxonomy small and coarse; prefer one broad tag per surface over many
fine-grained ones (fewer trigger call-sites, negligible extra recompute).

## Design

### 1. Generalize the web revalidate endpoint

`apps/web/src/app/api/revalidate/route.ts` — extend (keep POST + secret):

- Accept body `{ tags?: string[]; paths?: string[] }` (still accept legacy
  `{ slug }` → maps to `tour:<slug>` for backward compat during migration).
- **Allow-list**: validate every incoming tag against the known taxonomy (plus the
  `tour:*`/`post:*` prefixes). Reject unknown tags (400) so the endpoint can't be
  used to force arbitrary recompute.
- For each valid tag call `revalidateTag(tag, { expire: 0 })`; for each allowed
  path call `revalidatePath(path)`. Return `{ revalidated: [...] }`.
- Unchanged: `x-revalidate-secret` constant-time check (unset → 503, bad → 401).

### 2. Tag every public fetch

Add `next: { tags: [...] }` to the fetches that feed each surface (currently
untagged → only bustable by their timer):

- `getSiteMedia` → `['site-media']`
- `fetchTourCards` / counts → `['tours']`; `fetchTourDetail`/`fetchTourReviews`
  keep `['tour:<slug>']` (already tagged)
- `fetchDestinationTiles` / `fetchRegionBookables` / counts → `['destinations']`
- `fetchPosts` / `fetchPostTags` → `['posts']`; `fetchPost` → `['post:<slug>']`
- `fetchActiveCategories` → `['categories']`
- `fetchFeaturedReviews` → `['featured-reviews']`
- `fetchTrustStats`/`reviewSummary`/`count()` → `['trust-stats']`

A route's own `export const revalidate` (page-level ISR) is separate from a
`fetch` tag — the tag lets the API bust the fetch's Data Cache entry regardless of
the page timer. Keep the page timers as the backstop.

### 3. Fix the sharp gaps

- **`/blog` list** (`apps/web/src/app/blog/page.tsx`): add `export const
  revalidate = 300` **and** tag its fetches (`posts`). Removes static-until-deploy.
- **Footer categories**: drop `fetchActiveCategories` from 3600s to 300s for
  consistency (the tag makes the timer a pure backstop anyway).

### 4. API-side triggers — extend `WebRevalidationService`

Generalize `WebRevalidationService` from tour-only to a small
`revalidateTags(tags: string[])` (POSTs `{ tags }`; fire-and-forget, ~3s timeout,
swallow errors, no-op when secret/URL unset). Keep `revalidateTour(slug)` as a
thin wrapper. Then call it **after DB commit** from each mutating path:

| Module / operation | Tags to bust |
| --- | --- |
| Tours: create/update/publish/unpublish/delete | `tours`, `tour:<slug>`, `trust-stats` |
| Departures: create/update/delete (affecting a tour) | `tour:<slug>` |
| Site-media: set/clear slot | `site-media` |
| Posts: create/update/publish/unpublish/delete | `posts`, `post:<slug>` |
| Destinations: create/update/delete | `destinations` |
| Categories: create/update/delete | `categories` |
| Reviews: approve/unapprove (existing) | `tour:<slug>`, `trust-stats` |
| Reviews: setFeatured/unfeature | `featured-reviews` |

Firing from the **API** (not admin actions) is deliberate: it is the single write
choke point and covers every path (including future non-admin writers). It must
run **post-commit** (never inside the Prisma transaction) so a revalidation
failure can never affect the mutation.

### 5. Failure & safety policy

- Fire-and-forget with timeout; errors are logged and swallowed. A missed bust is
  covered by the ISR backstop (≤300s) — correctness degrades to "slightly stale",
  never to "broken write".
- Secret required (`REVALIDATE_SECRET` on both apps). Unset → skip + log; timer
  still applies.
- Endpoint stays POST + secret + tag allow-list (no arbitrary tag/path).

## Out of scope

- Redis / app-level API response caching (a different layer; revalidation — not
  Redis — is what fixes the delay).
- Changing dynamic surfaces (`/account/*`, checkout, authed reads).
- Multi-instance shared Next cache handler — web runs on Vercel's distributed
  cache, so `revalidateTag` already propagates. (Noted only as a caveat for any
  future self-hosted multi-instance deploy.)

## Risks

- **Over-busting** → extra recompute. Mitigated by coarse tags + Vercel handling
  the recompute lazily on next request.
- **Cross-app coupling** (API needs `FRONTEND_URL` + secret) — already true for
  reviews; extend the same config.
- **Missed call-site** → that mutation stays timer-only (safe: the trigger table
  is the checklist; a unit test asserts each mutating service calls the revalidator
  with the expected tags).

## Success criteria

1. Editing an Appearance slot (e.g. Hero backdrop) shows on the homepage on the
   **next request** (seconds), not after 300s.
2. Publishing/editing a tour, post, destination, or category reflects on the
   relevant public page within seconds; the blog list shows new posts without a
   redeploy.
3. Every mutating API path in §4 fires the matching tag post-commit; a
   missed/failed bust still self-heals within the ISR backstop.
4. Dynamic/authed pages are unchanged; `/gate` green; the tag taxonomy has one
   source of truth shared by web fetches and (by string contract) the API.

## Status

📄 Draft — plan at [../07-plans/2026-07-17-generalized-ondemand-revalidation.md](../07-plans/2026-07-17-generalized-ondemand-revalidation.md). Not started.
