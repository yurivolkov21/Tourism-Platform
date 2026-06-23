# Spec — P3 Tours listing + Tour detail

**Date:** 2026-06-22 · **Phase:** P3 (customer web) · **Branch:** `feat/p3-tours`
**Grounds:** Lily's `/tours` facet layout (destination / travel-styles / theme / duration / type),
the existing `TourCard` / `TourTile` components, and the `destinations.fixtures` tour data.

> Add the **tours catalogue** the IA is missing: a filterable `/tours` grid + a `/tours/[slug]`
> detail page. **UI-first** with fixtures shaped like the eventual `@tourism/core` DTOs; wire real
> data + real booking later. Also retire the placeholder `#tours` nav anchor → real `/tours`.

## Goal & Scope

Build **`/tours`** (filterable `TourCard` grid with a left sidebar of facets + sort) and
**`/tours/[slug]`** (gallery · itinerary · highlights · sticky booking box), then point the navbar
**Tours** dropdown at `/tours`. Layout-first, tokens-only, reuse `@tourism/ui` + existing blocks.

## Locked decisions (from brainstorming)

- **Both** listing **and** tour-detail ship this round.
- **Facets:** Destination · Duration · **Travel style** · **Theme** — the last two are **new tags added
  to the fixtures** (`travelStyles[]`, `themes[]`). (Lily's 5th facet "type" is folded into theme.)
- **Filter UI:** left **sidebar** (desktop) + **drawer** (mobile, via `@tourism/ui` Sheet/Dialog).
- **Filter state:** **client-side React state** — the page stays **static/SSG** (no URL params this round;
  URL-as-state can be a later enhancement).
- **Booking box:** **UI-only** — shows price + a placeholder departures list + a "Request to book" CTA that
  jumps to the on-page enquiry form (`#contact`). Real Stripe/PayPal booking is **out** (P3 later / done in BE).
- **Data:** fixtures (UI-first); real `@tourism/core` client wiring **deferred to end of P3**.
- **English-only** (ADR-0005); copy in `@tourism/i18n` (`toursPage` + `tourDetail` namespaces). No VI.

## In / Out of scope

| In | Out (later) |
| --- | --- |
| `/tours` grid + sidebar facets + sort + result count + empty state | URL-synced filters (`?style=…`) |
| `/tours/[slug]` SSG: gallery · itinerary · highlights · included · sticky booking box | Real booking / checkout / departures from API |
| `travelStyles[]` + `themes[]` tags on fixtures; pure `filterTours` in `@tourism/core` (TDD) | Reviews UI on detail (later) · map on detail |
| Navbar Tours dropdown → `/tours`; tour tiles link → `/tours/[slug]` | Real `@tourism/core` data wiring · Framer motion |

## Routes

| Route | Render | Notes |
| --- | --- | --- |
| `/tours` | **static** | Listing. Filtering is client-side state over the full fixture set → page pre-renders static. |
| `/tours/[slug]` | **SSG** | `generateStaticParams` from all fixture tour slugs; unknown slug → `notFound()`. |

Tour tiles (`TourTile`, `TourCard`) currently link to `#tour-<slug>` → change to **`/tours/<slug>`**.
Navbar `toursMenu.items` currently point at `#tours` → repoint the menu label/links at `/tours`
(experiences stay as anchors only if no page exists; otherwise `/tours?theme=…` is a later nicety — this
round they all go to `/tours`).

## Data model (fixtures-first)

- **Extend `TourCardData`** (in `tour-card.tsx`) with two optional tag arrays used only for filtering:
  - `travelStyles?: TravelStyle[]` — `TravelStyle = 'family' | 'couples' | 'adventure' | 'luxury' | 'group' | 'private'`
  - `themes?: TourTheme[]` — `TourTheme = 'cruise' | 'trekking' | 'cultural' | 'culinary' | 'beach' | 'nature'`
  - Tags are passed per tour through the existing `tour(…, extras)` seam — **no helper signature change**.
- **Listing helpers** (`apps/web/src/lib/tours.ts`):
  - `allTours(): TourCardData[]` — flatten `destinations.fixtures` tours (dedupe by slug).
  - `tourSlugs(): string[]` — for `generateStaticParams`.
  - `getTourBySlug(slug): TourCardData | undefined`.
  - `getTourDetail(slug): TourDetailVM | undefined` — the card + **generated placeholder detail**: a gallery
    (reuse region image pools), a **day-by-day itinerary derived from `durationDays`**, `highlights[]`,
    `included[]` / `notIncluded[]`, and a placeholder `departures[]`. Keeps fixture bloat low.
- **Pure filter logic → `@tourism/core`** (TDD): `filterTours(tours, f)` where
  `f = { destinations?: string[]; durations?: DurationBucket[]; styles?: TravelStyle[]; themes?: TourTheme[] }`.
  Semantics: **within a facet = OR**, **across facets = AND**; empty facet = no constraint. Plus `sortTours(tours, sort)`
  (`'popular' | 'price-asc' | 'price-desc' | 'rating'`). `DurationBucket = '1' | '2-3' | '4+'` via a pure
  `durationBucket(days)`.
- Region facet (if shown) reuses TDD'd `groupByRegion`.

## Per-section design

### `/tours` listing

- **Header** — `ContentHero` (image + breadcrumb `Home / Tours` + title + subtitle). Consistent with content pages.
- **Body** — `lg:grid lg:grid-cols-[16rem_1fr] gap-…`:
  - **Sidebar** (`ToursFilters`, desktop `lg:block`): facet groups (Destination · Duration · Travel style · Theme),
    each a checkbox list; a **Clear all** button; live result count. Mobile: hidden; a **"Filters"** button opens
    a **Sheet/Dialog drawer** with the same `ToursFilters`.
  - **Results** — toolbar (result count + **Sort** select) → responsive `TourCard` grid (`sm:grid-cols-2 lg:grid-cols-3`).
    **Empty state** when filters match nothing (icon + "No tours match — clear filters").
- Reuse `TourCard`. Active filter chips above the grid (optional, nice-to-have) for quick removal.

### `/tours/[slug]` detail

- **TourHero** — full-bleed cover (or gallery lead) + breadcrumb + title + meta row (destination · duration ·
  rating·reviews) + price; on desktop the **sticky `BookingBox`** sits in an aside.
- **2-col layout** (`lg:grid lg:grid-cols-[1fr_22rem]`): main column = overview → **Highlights** →
  **Itinerary** (day-by-day, `@tourism/ui` Accordion) → **What's included / not included** → **Gallery**
  (reuse `Gallery` + lightbox); aside = **`BookingBox`** (`lg:sticky lg:top-24`): price "from $X / person",
  placeholder departures list, **"Request to book"** → `#contact`, trust line.
- **Enquiry** — reuse `PlanTripForm` (id `#contact`) near the bottom so the booking CTA has a target on the page.
- Tour-detail uses **default chrome** (no per-region L2 here); accent = `primary`.

## i18n (`@tourism/i18n`, EN-only)

- `toursPage`: `breadcrumb`, `title`, `subtitle`, `filtersLabel`, `clearAll`, `resultCount(n)`, `sortLabel`,
  `sortOptions{popular,priceAsc,priceDesc,rating}`, `empty{title,body,cta}`, facet group headings
  (`destination`, `duration`, `travelStyle`, `theme`), `durationBuckets{ '1','2-3','4+' }`, and tag display maps
  (`styleLabels`, `themeLabels`).
- `tourDetail`: `overview`, `highlights`, `itinerary`, `dayLabel(n)`, `included`, `notIncluded`, `gallery`,
  `booking{ heading, fromLabel, perPerson, departures, requestCta, trustLine }`, `meta{ duration, rating }`.

## Testing

- **Unit (Jest/SWC, `@tourism/core`):** `filterTours` (each facet; within-OR/across-AND; multi-select; empty
  result; no-filter passthrough), `durationBucket`, `sortTours`. Target ≥80% on the new pure logic.
- **Visual:** manual screenshots `/tours` + `/tours/[slug]` at 375 / 768 / 1440 (sidebar→drawer, grid reflow,
  sticky booking, itinerary). 0-overflow check. e2e in the later motion/e2e pass.
- **Build:** `pnpm nx build @tourism/web` type-checks the routes.

## Planned files

```text
@tourism/core   src/lib/tours-filter.ts  (+ .spec.ts)   filterTours · durationBucket · sortTours · types
apps/web/src/lib/tours.ts                allTours · tourSlugs · getTourBySlug · getTourDetail (+ TourDetailVM)
apps/web/src/components/tours/tour-card.tsx              + travelStyles?/themes? on TourCardData
apps/web/src/components/tours/tours-filters.tsx          (client) facet checkbox groups + clear-all
apps/web/src/components/tours/tours-listing.tsx          (client) sidebar + drawer + grid + sort + empty
apps/web/src/components/tours/booking-box.tsx            sticky price/departures/request-to-book
apps/web/src/components/tours/tour-itinerary.tsx         day-by-day accordion
apps/web/src/components/tours/tour-highlights.tsx        + tour-included.tsx
apps/web/src/app/tours/page.tsx                          listing (static)
apps/web/src/app/tours/[slug]/page.tsx                   detail (SSG + generateStaticParams + notFound)
apps/web/src/lib/destinations.fixtures.ts               + travelStyles/themes tags per tour
libs/shared/i18n/src/lib/messages.ts                    + toursPage + tourDetail
apps/web/src/components/layout/site-header.tsx          Tours menu → /tours
```

## Risks / notes

- **Static + client filter:** safe — the page renders the full set server-side; filtering is client state (no SSR).
- **Placeholder detail realism:** itinerary/included/departures are generated/placeholder; clearly review-only,
  swap when real data lands. Keep generators simple + deterministic.
- **Facet data:** tags are authored on fixtures — keep the taxonomy small (6 styles / 6 themes) to avoid sparse facets.
- **`@nx/enforce-module-boundaries`:** filter logic in `@tourism/core` (data-access), UI in web — no cross-scope leak.
- **Booking box** must not imply a real transaction — copy = "Request to book" (enquiry), not "Pay".
