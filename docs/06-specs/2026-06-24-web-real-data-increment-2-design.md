# Web real-data increment-2 — design

**Status:** 2a merged (`ab76324`) · 2b in review · **Date:** 2026-06-24 ·
**Branches:** `feat/web-home-real-data` (2a) · `feat/web-tour-detail-real-data` (2b)

## Context

Web increment-1 wired `/tours` (listing) and `/destinations` (overview) to the
real API via a public client + adapters (ISR 300s). The rest of the public web
still renders fixtures. The new **LILY-SEED** catalog (rich tours with real
itineraries / FAQs / policies / approved reviews / badges, 13 destinations) now
makes the remaining surfaces wireable.

Source of truth for what the API returns: the running Swagger spec and the
generated `@tourism/core` client. Public endpoints available: `GET /tours`,
`GET /tours/:slug` (`TourDetailDto` = summary + itinerary + faqs + policies),
`GET /tours/:slug/reviews`, `GET /destinations`, `GET /destinations/:slug`,
`GET /posts`, `GET /tour-categories`.

## Scope

Two sub-increments, smallest/highest-impact first:

### 2a — Home real data (this branch)

- **Featured Packages** (currently a hard-coded `TourCardData[]`) → real
  featured tours via the existing `fetchTourCards({ featured: true })`.
- **Destinations bento** (currently `homeDestinations` fixtures) → real tiles
  via the existing `fetchDestinationTiles()`, curated into the bento layout.

### 2b — Tour detail `/tours/[slug]` (next branch)

- Replace the `lib/tours.ts` fixture VM with a `GET /tours/:slug` adapter +
  `GET /tours/:slug/reviews`. SSG slugs from `fetchTourCards()`.
- Real fields now available: itinerary, included/excluded, highlights, FAQs,
  policies, badges, rating, gallery media, destinations, reviews.
- UI-only fields with no API source (`mealTotals`, `transport`,
  `accommodation`, `departureFrequency`, hero `badge`, `related`, `departures`)
  are derived from available data or omitted gracefully — **not** blockers.

Out of scope (later): region detail `/destinations/[region]` (fixture-heavy
gallery/signature content), Blog teaser (gated on the P6 `/blog` pages),
Experiences (static categories are fine).

## 2a design

### Data flow

`app/page.tsx` becomes an **async server component** with `revalidate = 300`.
It fetches in parallel (each `.catch(() => [])` like the wired pages):

- `fetchTourCards({ featured: true })` → featured tour cards
- `fetchDestinationTiles()` → destination tiles, then `pickHomeBento(tiles)`

Data is passed down as props. Both sections **render only when their data is
non-empty** — on an API error/cold-start the section is hidden rather than
showing an empty carousel/grid (the landing page never looks broken).

### `pickHomeBento` (pure, TDD'd — `lib/home-bento.ts`)

Curates the flat API tile list into the existing six-tile bento, preserving the
current layout emphasis (`span`s):

| order | slug | span |
| --- | --- | --- |
| 1 | `ha-long-bay` | `lg:col-span-2 lg:row-span-2` |
| 2 | `sa-pa` | `lg:col-span-2` |
| 3 | `hoi-an` | — |
| 4 | `hue` | — |
| 5 | `ho-chi-minh-city` | `lg:col-span-2` |
| 6 | `mekong-delta` | `lg:col-span-2` |

`pickHomeBento(tiles, config = HOME_BENTO)` returns the tiles whose slug appears
in `config`, in config order, with `span` applied. Configured slugs not present
in `tiles` are skipped (graceful — bento simply shrinks). Empty input → empty.

### Component changes

- `FeaturedPackages` — accepts `tours: TourCardData[]` prop; drop the hard-coded
  array + `cover()` helper. Stays a client carousel; data arrives via prop.
- `Destinations` — accepts `tiles: DestinationTileVM[]` prop; drop the
  `homeDestinations` import.
- `homeDestinations` / `HOME_SLUGS` fixtures stay (still used by other surfaces
  / tests) — only the home component stops importing them.

## 2b design

`/tours/[slug]` switches from the `lib/tours.ts` fixture VM to API data, keeping
the existing component prop contracts (build the same `TourDetailVM`, just from
the API). New adapter `lib/api/tour-detail.ts`:

- `fetchTourDetailSlugs()` → published slugs (from `fetchTourCards()`) for
  `generateStaticParams` (async; empty on cold build → pages render on-demand
  via ISR, `dynamicParams` default).
- `fetchTourDetail(slug)` → `GET /tours/:slug` (`TourDetailDto`) → `TourDetailVM`,
  or `null` (→ `notFound()`).
- `fetchTourReviews(slug)` → `GET /tours/:slug/reviews` → `{ reviews, rating,
  reviewCount }` (maps `PublicReviewDto` → `TourReview`: `reviewer.fullName` →
  author, `createdAt` → formatted date, `body` → quote).
- related → `fetchTourCards()`, exclude current slug, take 4.

**Real fields:** title, summary→overview, durationDays, basePrice, compareAtPrice,
currency, averageRating→rating, reviewsCount→reviewCount, badges, primary
destination, gallery (media), itinerary (dayNumber→day, description→body),
included, excluded→notIncluded, FAQs, policies, reviews.

**Derived (no discrete API field — neutral, not fake catalog data):**

- `meals` (string): the meal line parsed from `included` (e.g. "4 breakfasts, 3
  lunches, 2 dinners") via `parseMealsLine`, else "Meals as listed".
- `transport`: an `included` transport line, else "Private transfers".
- `accommodation`: duration-derived ("Day tour — no overnight stay" / "Hotel · N
  nights"). `departureFrequency`: neutral "Flexible dates".
- hero `badge`: `bestSeller` when API badges include POPULAR/BEST_VALUE, else none.
- `departures`: `[]` — the detail DTO doesn't expose departures, and booking is
  still UI-only (`#contact`). BookingBox hides the departures block when empty.
  (Exposing real departures + wiring booking is a later increment.)

**VM / component changes (minimal, contract-preserving):**

- `TourDetailVM` (lib/tours.ts) gains optional `faqs?`, `policies?`, and a `meals`
  string; the fixture `getTourDetail` keeps compiling (sets them too). `mealTotals`
  becomes optional.
- `TourFaq` / `TourPolicies` accept optional data props, falling back to the i18n
  copy when omitted (real data passed from the page).
- `BookingBox` guards the departures block on `departures.length > 0`.
- `page.tsx` becomes async with `revalidate = 300`; fetches detail + reviews +
  related in parallel; `notFound()` on a missing/unpublished slug.

## Tests

- `lib/home-bento.spec.ts` — order preserved · missing slug skipped · span
  applied · empty input → empty (web jest).
- `lib/tour-detail-derive.spec.ts` — `parseMealsLine` (full / partial / singular
  / none) · `pickRelated` (excludes current, caps at 4) (web jest).
- Visual/layout via build + manual review (web has no separate typecheck;
  `build` type-checks). Existing `@tourism/core` tour/destination tests unchanged.

## Risks

- **Cold-start at build:** Render free may be asleep when Vercel builds → API
  returns empty → home sections hidden until ISR revalidation (300s) or a
  redeploy with the API warm. Mitigation: arm the keep-alive pinger
  (`API_HEALTH_URL` repo var) before relying on it for a live demo.
