# Design spec — Wire web (customer) to real API data

> Branch: `feat/web-real-data` · Replaces the web's static **fixtures** with live data from
> `@tourism/core` against the deployed API. Closes the admin→API→web loop (the demo's killer story:
> "create a tour in admin → it appears on the public site"). Roadmap P3 "wire real data" item.

## Current state

- Web pages read **fixtures**: `lib/tours.ts` (`allTours`/`getTourDetail`/`tourSlugs`), `lib/destinations.fixtures.ts`,
  `featured-packages.tsx`, `blog-teaser.tsx`. `@tourism/core` is used only for **types + helpers**
  (`filterTours`/`sortTours`, destination grouping) — **no API client wrapper in web yet**.
- API is **deployed** (`https://tourism-api-pqwr.onrender.com/api/v1`), public read endpoints are
  `@Public` (no token). Render free **sleeps after 15 min** → must avoid per-request fetches.

## The gap (why this isn't a 1:1 swap)

The web view-models carry fields the API **read** DTOs don't return:

| Web field (VM) | API source | Gap / decision |
| --- | --- | --- |
| card `title/durationDays/basePrice/compareAtPrice/currency` | `TourSummaryDto` | ✅ direct |
| card `destination` (name) | `destinations[].destination.name` (primary) | ✅ map (pick `isPrimary`) |
| card `image` | `media[0]` URL | ✅ map (fallback placeholder if none) |
| card **`rating` / `reviewCount`** | ❌ not in `TourSummaryDto` | **needs backend** (add `averageRating`+`reviewsCount`) OR omit on cards |
| card/detail **`badges`** (POPULAR…) | `badges` exists but **write-only** (not returned) | **needs backend** (return it) OR derive from `isFeatured` |
| detail `overview/gallery/itinerary/included/excluded/meetingPoint/faqs/policies` | `TourDetailDto` | ✅ direct (itinerary `dayNumber/description`→`day/body`) |
| detail `departures` (+`seatsLeft`) | `GET /tours/:slug/departures` (separate) | ✅ fetch + compute `seatsTotal−seatsBooked` |
| detail `reviews` | `GET /tours/:slug/reviews` (separate) | ✅ fetch |
| detail `transport/accommodation/mealTotals/departureFrequency` | ❌ not modelled | **placeholder/derive** (or drop those UI bits) |
| detail `related` | none | derive (same category/destination) |

**Backend decision needed:** to wire cards faithfully (rating + badges), extend the tour **read** DTOs:
add `averageRating` + `reviewsCount` to `TourSummaryDto`/`TourDetailDto`, and **return `badges`**
(the admin-stats service already computes per-tour ratings, so the data exists). Small, TDD-able.

## Proposed phasing (one increment per branch)

- **Increment-1 (this branch) — read catalog: tours + destinations lists.**
  - **Backend (small):** extend `TourSummaryDto` (+ `TourDetailDto`) with `averageRating: number`,
    `reviewsCount: number`, and surface `badges: TourBadge[]`; service computes rating via the existing
    aggregate. Regen `@tourism/core`. TDD + gate.
  - **Web data layer:** `lib/api/client.ts` (server, public — `createApiClient({ baseUrl })`, no token) +
    `lib/api/tours.ts` / `lib/api/destinations.ts` fetchers + **adapters** (DTO→VM) replacing the fixture
    fields. Centralize `NEXT_PUBLIC_API_BASE_URL`.
  - **Wire pages:** `/tours` (listing — `filterTours`/`sortTours` still run client-side over real data),
    `/destinations` overview + `/destinations/[region]`. **Keep SSG/ISR:** `export const revalidate = 300`
    (+ `generateStaticParams` where slugs are known) → static-with-revalidation, **not** per-request →
    dodges Render cold-start on every visit and survives brief API sleeps.
  - **Graceful states:** API down/empty → existing empty states (no crash); image fallback when no media.
- **Increment-2 (later):** tour **detail** (`/tours/[slug]` + departures + reviews + faqs/policies;
  placeholder policy for transport/meals/accommodation), home page (featured/destinations bento), BlogTeaser→`/posts`.
- **Increment-3 (later):** customer **booking** flow (departure → `POST /bookings` → Stripe test).

## Out of scope (this increment)

Tour detail page · home-page sections · blog · booking/account · web auth (separate parked spec).

## Open decisions for sign-off

1. **Backend read-DTO extension** (add `averageRating`/`reviewsCount` + return `badges`) — do it (faithful
   cards, recommended) **or** skip backend and have web omit rating/derive badges from `isFeatured`?
2. **Increment-1 scope** = tours listing + destinations only (detail/home/booking deferred) — OK?
3. **ISR window** — `revalidate = 300s` (5 min) reasonable for a demo? (lower = fresher but more cold-starts.)
