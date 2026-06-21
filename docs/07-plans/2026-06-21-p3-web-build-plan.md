# Plan — P3 Customer Web Build (IA + pages)

**Date:** 2026-06-21 · **Phase:** P3 (customer web) · Grounded in
[lily-design-study.md](../03-reference/lily-design-study.md) + the Emerald Heritage brand
([design-direction](../06-specs/2026-06-21-p2-design-direction.md)) + the Prisma schema.

> Build the actual usable experience, layout-first, with placeholder fixtures shaped like real DTOs;
> wire the typed `@tourism/core` client later. Reuse `@tourism/ui` + tokens; copy in `@tourism/i18n`.

## Information architecture — place-led

`Region (North / Central / South) → Destination → Tour`. Maps to `Destination(region, name, slug)` ⇄
`Tour` (M:N) ⇄ `TourCategory`.

**Routes (Next app-router):**

- `/` — home
- `/destinations` — overview (region-grouped, editorial)
- `/destinations/[slug]` — destination page (intro + its tours)
- `/tours` — listing (filterable `TourCard` grid)
- `/tours/[slug]` — tour detail
- `/about`, `/contact`

**Primary nav:** Tours · Destinations · About · Contact (+ Log in). (Header already built.)

## Two-tier visual philosophy (from the study)

- **Inspiration tier — editorial/minimal:** home, destinations overview, destination hero. Image-forward,
  Fraunces serif, one-line atmospheric taglines, minimal price/logistics.
- **Booking tier — detail-rich:** tours listing + tour detail. `TourCard`, price + `compareAtPrice`,
  rating, itinerary, sticky booking box.

## Page blueprints

**Home (`/`)** — order: Header (✓) · Hero (✓) · **Explore by destination** (editorial, region-grouped +
tagline — refine current Destinations) · **Why travel with us** = Features (✓) · **Featured journeys**
(minimal teaser: image + name + place) · **Trust** (reviews/guarantee strip) · **Enquiry CTA** (plan-your-trip
lead teaser) · **Footer**.

**Destinations overview (`/destinations`)** — region-grouped editorial tiles (fuller version of the home
section), each: image + name + region + tagline + tour count.

**Destination page (`/destinations/[slug]`)** — destination hero (image + name + region + intro) → its
tours (`TourCard` listing) → enquiry CTA.

**Tours listing (`/tours`)** — filter bar (region / category / duration / price) + `TourCard` grid +
pagination. The e-commerce tier.

**Tour detail (`/tours/[slug]`)** — hero/gallery + breadcrumb · **meta strip** (price→compareAt, rating,
start/end, places, meals, duration, departures) · **2-col**: left = overview + highlights + **day-by-day
itinerary** + inclusions/excluded + policies + FAQs; right = **sticky booking box** (price + departure
select + Inquire/Book) · related tours · enquiry. Maps to `Tour` (itinerary, included/excluded, highlights,
departures, policies, faqs).

**About (`/about`)** — brand/founder hero · values (4 pillars) · story/timeline · team · trust · enquiry.

**Contact / Enquiry (`/contact`)** — enquiry form mapping the `Enquiry` model (nationality, travelDate,
groupSize, budgetTier, interests[]) + contact info.

## Components to build (reuse-first)

- **SiteFooter** (multi-col + enquiry teaser) — used site-wide.
- **DestinationTile** (editorial) — extract/refine from current Destinations section.
- **TourCard** (✓, reuse on listing/detail/related).
- **PriceDisplay** (price + `price-compare` tokens), **RatingStars** (rating/brass token), **Badge** map
  (`TourBadge` → tokens) — small shared primitives.
- **EnquiryForm** (maps Enquiry DTO; Base UI `field`, zod later via core).
- **Breadcrumb**, **ItineraryDay** (accordion), **StickyBookingBox**, **Trust/Reviews strip**.

## Data strategy

- **Now:** placeholder fixtures shaped like the eventual `@tourism/core` DTOs (layout-first).
- **Later (separate step):** wire the P1.8b typed client; replace fixtures with real queries.

## Build order

1. **Finish the homepage:** refine Destinations (region + tagline) · Featured journeys (minimal) · Trust ·
   Enquiry CTA · **SiteFooter**.
2. **Destinations overview** + **Destination page**.
3. **Tours listing** (TourCard grid + filters).
4. **Tour detail** (blueprint above) — the richest page.
5. **About** + **Contact/Enquiry**.
6. **Wire real data** (`@tourism/core`).
7. **Motion pass** (deferred, cross-block, using motion tokens) + a11y + performance.

## Conventions

- Inspiration surfaces image-forward + Fraunces serif; **no hex / no raw rainbow** (`pnpm check:no-hex`).
- Copy in `@tourism/i18n` (EN-only, ADR-0005); reuse `@tourism/ui` first.
- Per section/page: build → gate (+ no-hex) → review → branch → rebase-merge.
- Each block adapted from a reference is **rebuilt** for the project (not vendored), brand-aligned.

## Out of scope (this plan)

Real auth/booking flow wiring, payments UI, admin (P4), mobile (P5).
