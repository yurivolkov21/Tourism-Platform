# Spec — P3 Destinations (overview + destination page)

**Date:** 2026-06-21 · **Phase:** P3 (customer web) · **Branch:** `feat/p3-destinations`
**Builds on:** [p3-web-build-plan](../07-plans/2026-06-21-p3-web-build-plan.md) (build order #2) ·
[lily-design-study](../03-reference/lily-design-study.md) · brand
[p2-design-direction](2026-06-21-p2-design-direction.md).
**Visual references:** `docs/Lily Wireframes/uploads/lilystravelagency.com_tours-in-vietnam_.png`
(overview) + `..._northern-vietnam-tours_.png` (destination page) + the matching `.dc.html` wireframes.

> Build the second P3 surface after the homepage: a place-led **Destinations overview** and a
> per-destination **Destination page**, layout-first with placeholder fixtures shaped like the eventual
> `@tourism/core` DTOs. Reuse `@tourism/ui` + tokens; copy in `@tourism/i18n`. Wire real data later (#6).

## Goals

- `/destinations` — region-grouped editorial overview (the "inspiration tier"), modelled on Lily's
  `tours-in-vietnam` page but rebuilt in the Emerald Heritage brand.
- `/destinations/[slug]` — a single destination: hero + intro + its tours + value props + enquiry,
  modelled on Lily's region page (`northern-vietnam-tours`).
- Extract a reusable `DestinationTile` so the home teaser and the overview share one component.
- Pure, tested helpers for region grouping and slug lookup.

## Non-goals (this branch)

Tours listing (`/tours`) + tour detail (`/tours/[slug]`) — plan #3/#4. Real data wiring to
`@tourism/core` — plan #6. Filters/search, booking flow, auth. **No** restructuring of the existing
home Destinations bento (it stays as the teaser — decided 2026-06-21).

## Data model grounding

`Destination` (Prisma): `id, slug, name, country="Vietnam", region (String? VarChar(80)),
description (String? VarChar(2000)), isActive`, `tours TourDestination[]` (M:N). **`region` is
free-text**, not an enum — the overview groups by the three canonical strings
`Northern Vietnam` / `Central Vietnam` / `Southern Vietnam`, ordered North → Central → South.

Presentational fields **not** in the schema (editorial, fixtures-only for now): `tagline` (short
overlay line), `tourCount` (derived from M:N), `image`/cover (temporary Unsplash; swap for
`MediaAsset` later), and a destination's `tours[]` summary for the detail page.

## Architecture

### Routes (Next app-router, `apps/web/src/app`)

- `app/destinations/page.tsx` — overview (static; reads fixtures).
- `app/destinations/[slug]/page.tsx` — destination page. `generateStaticParams()` from fixtures;
  unknown slug → `notFound()` (renders `not-found.tsx`).

### Page composition

**Overview (`/destinations`)**

1. `DestinationsHero` — full-bleed image + centred title/subtitle ("Explore Vietnam by destination").
2. `RegionGroup` ×3 (North → Central → South) — section heading + grid of `DestinationTile`
   (uniform, no bento span), each links to `/destinations/[slug]`.
3. `PopularTours` strip — heading + a few featured `TourCard` (reuse). (Decided: include.)
4. `EnquiryCta` (reuse) — plan-your-trip lead teaser.

**Destination page (`/destinations/[slug]`)**

1. `DestinationHero` — full-bleed cover + name + region/country breadcrumb-ish label.
2. `DestinationIntro` — `description` editorial copy + a supporting image / thumbnail set.
3. `DestinationTours` — "Tours in {name}" heading + `TourCard` grid (that destination's tours).
4. `ValueProps` — compact 3-up "Why travel with us" (reuse/adapt `WhyChoose`/`Features`).
5. `EnquiryCta` (reuse).

### Components

| Component | Path | Notes |
| --- | --- | --- |
| `DestinationTile` | `components/destinations/destination-tile.tsx` | **Extracted** from home `destinations.tsx`. Props: `destination` + optional `span` (bento at home, omitted on overview). Image + scrim + name + tagline + tourCount. |
| `RegionGroup` | `components/destinations/region-group.tsx` | Heading + tile grid for one region. |
| `DestinationsHero` | `components/destinations/destinations-hero.tsx` | Overview hero. |
| `DestinationHero` | `components/destinations/destination-hero.tsx` | Detail hero. |
| `DestinationIntro` | `components/destinations/destination-intro.tsx` | Detail intro + media. |
| `DestinationTours` | `components/destinations/destination-tours.tsx` | Wraps `TourCard` grid. |
| `PopularTours` | `components/destinations/popular-tours.tsx` | Overview featured strip (reuse `TourCard`). |
| reuse | — | `TourCard`, `EnquiryCta`, value-props from `WhyChoose`/`Features`. |

Home `marketing/destinations.tsx` is refactored to import the extracted `DestinationTile` (no visual
change to the home teaser). One behavioural change: home tiles now link to the real
`/destinations/[slug]` route instead of the current `#destination-<slug>` anchor.

### Data & helpers

**Pure logic lives in `@tourism/core`** (`libs/shared/core`), not in the web app: the web app has no
unit-test harness and the project tests pure logic in shared libs while covering web layout via e2e
(CLAUDE.md). Core already has a Jest (SWC) setup and is the designated home for domain logic + the
types real-data wiring will reuse. New module `libs/shared/core/src/lib/destinations/destinations.ts`,
exported from `libs/shared/core/src/index.ts`:

- `REGION_ORDER: readonly string[]` — canonical `['Northern Vietnam','Central Vietnam','Southern Vietnam']`.
- `groupByRegion<T extends { region: string | null }>(items, order?): { region: string; items: T[] }[]`
  — grouped + ordered by `order`; unknown/`null` regions sorted last; stable within a group.
- `getBySlug<T extends { slug: string }>(items, slug): T | undefined`.

Web fixtures `apps/web/src/lib/destinations.fixtures.ts` — single shared source the home teaser,
overview, and detail all read. Typed as a web view-model that extends the core `DestinationSummary`
type with editorial extras (`tagline`, `image`, `tours`). Generic helpers above are imported from
`@tourism/core`.

## Error handling

- Unknown destination slug → `notFound()` (404). `generateStaticParams` pre-renders known slugs.
- Destination with no tours → `DestinationTours` renders an empty-state message, not a broken grid.
- Empty region group → not rendered.

## Testing

- **Unit (TDD, Jest/SWC in `@tourism/core`):** `groupByRegion` (ordering N→C→S, unknown/null-last,
  stable, empty input); `getBySlug` (hit / miss). Run via `pnpm nx test @tourism/core`. ≥80% on helpers.
- **Visual / e2e:** deferred to the cross-page motion + e2e pass (plan #7). Manual screenshot review
  at 320 / 768 / 1024 / 1440 during build.

## Conventions

- Tokens-only, **no hex** (`pnpm check:no-hex`); inspiration surfaces image-forward + Fraunces serif.
- Copy in `@tourism/i18n` (EN-only, ADR-0005): add `destinationsOverview` + `destinationPage` namespaces.
- Reuse `@tourism/ui` first; app imports **relative**, not `@/`.
- Temporary Unsplash imagery via existing `next/image` `remotePatterns` (review only).
- Per the gate: build → `/gate` (+ no-hex) → review → user reviews → rebase-merge.

## Build order (for the plan)

1. Core helpers + type (TDD in `@tourism/core`) → then web fixtures consuming them.
2. Extract `DestinationTile`; refactor home to use it (no visual change).
3. Overview page (`DestinationsHero` → `RegionGroup` ×3 → `PopularTours` → `EnquiryCta`).
4. Destination page (`DestinationHero` → `DestinationIntro` → `DestinationTours` → `ValueProps` →
   `EnquiryCta`) + `generateStaticParams` + `not-found`.
5. i18n copy + nav links (header "Destinations" → `/destinations`).
6. Gate + responsive review.
