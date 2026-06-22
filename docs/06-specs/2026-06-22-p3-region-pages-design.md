# Spec — P3 Region pages (Northern / Central / Southern)

**Date:** 2026-06-22 · **Phase:** P3 (customer web) · **Branch:** `feat/p3-regions`
**Grounds:** Claude Design wireframes (`docs/Lily Wireframes/Lily's {Northern,Central,Southern} Vietnam
Wireframe.dc.html`), the live-crawl study
([lily-design-study §Live-crawl](../03-reference/lily-design-study.md)), and the Emerald Heritage brand.

> Add the **region layer** the IA was missing: `/destinations` overview → **3 region pages** (with a
> destination-filter tab bar + tour grid) → tour detail (later). Replaces the current per-destination
> `/destinations/[slug]` pages. **UI-first** with fixtures shaped like the eventual `@tourism/core`
> DTOs; wire real data in a later pass.

## Decisions (from brainstorming, locked)

- **Region pages are the primary destination layer.** Most destinations are **tabs** inside a region
  page, not separate routes. Per-destination / featured-destination landing pages are **deferred**.
- **Scope this round:** region pages + destination tabs + tour grid only. **Out:** tour detail, booking
  card, destination/theme landings, "Lily's Vlogs", the rich multi-field enquiry form, real-data wiring.
- **UI-first:** static + fixtures; reuse `@tourism/ui`, tokens-only, copy in `@tourism/i18n`.

## Routes

| Route | Render | Change |
| --- | --- | --- |
| `/destinations` | static | **Modify:** region mosaics' tiles + "View more" now link to the region page (no longer to per-destination pages). |
| `/destinations/[region]` | **SSG** (3) | **New.** `region ∈ {northern-vietnam, central-vietnam, southern-vietnam}` (slug = `slugify(region)`). Unknown → `notFound()`. |
| `/destinations/[slug]` | — | **Removed** (per-destination page) — replaced by `[region]`. |

Region tiles on the overview link to `/destinations/[region]?d=<destination-slug>` so the matching tab
is pre-selected; the feature tile / "View more" link to `/destinations/[region]` (ALL).

## Region-page composition (from the wireframe)

1. **`RegionHero`** — full-bleed image + scrim, region name (left-aligned, Fraunces) + one-line tagline.
   Breadcrumb `Home / Destinations / {Region}`.
2. **`RegionIntro`** — 2-col: **left** = "The best {Region} tours" heading + brass accent rule + a
   **video slot** (static poster + play affordance; real embed later) + intro paragraphs + a
   **"{Region} itineraries"** CTA button (→ `#`, itinerary blog is P6); **right** = a photo **collage**
   (2×2). Mobile stacks: heading → video → text → collage → CTA.
3. **`RegionTours`** *(client)* — the heart of the page:
   - **Tab bar**: `All` + the region's destinations (e.g. *Hạ Long Bay · Sa Pa · Ninh Bình · Hà Giang*).
   - **Tour grid** (4-up desktop / 2-up mobile): image-background tour tiles (photo + name), filtered by
     the active tab (`tour.destination === tab`, or all). Tiles link to `/tours/[slug]` (placeholder `#`
     until tour detail exists). Empty state when a tab has no tours.
   - Initial tab from `?d=<slug>` search param when present, else `All`.
4. **`ValueProps`** (reuse) — "We've got you covered": Luxury transfers · Unique itineraries · Epic meals.
5. **`EnquiryCta`** (reuse) — lead form (the wireframe's rich multi-field enquiry is a **later**
   enhancement; reuse the existing split form this round).
6. Global header/footer.

## Data & helpers (fixtures-first)

Reuse `apps/web/src/lib/destinations.fixtures.ts` (12 destinations grouped by region, each with a
`tours: TourCardData[]` list; every tour already carries a `destination` field). Add a derive helper:

- `getRegion(regionSlug): { name: string; tagline: string; intro: string; destinations: { name: string;
  slug: string }[]; tours: TourCardData[] } | undefined` — in the fixtures module (or a small `regions`
  helper). Built by filtering `destinations` where `slugify(d.region) === regionSlug`, then collecting
  their `tours` and the destination list for the tabs.
- `regionSlugs(): string[]` for `generateStaticParams` (the 3 canonical regions, via `groupByRegion` from
  `@tourism/core`).

Pure tab-filter logic (`filterToursByDestination(tours, destinationName | 'all')`) is trivial and lives
with the client component; the region grouping already comes from `@tourism/core` (`groupByRegion`, TDD'd).
If we add a non-trivial helper, it goes to `@tourism/core` with a test.

Region intro copy + taglines: add to `@tourism/i18n` (`regionPage` namespace, keyed by region).
Some fixtures may gain 1–2 more tours per destination so each region's grid reads full.

## Components

| Component | Path | Notes |
| --- | --- | --- |
| `RegionHero` | `components/destinations/region-hero.tsx` | adapt `DestinationHero` (left-aligned title + tagline) |
| `RegionIntro` | `components/destinations/region-intro.tsx` | heading + accent + video slot + text + CTA + collage |
| `RegionTours` | `components/destinations/region-tours.tsx` | **client** — tab bar + filtered tile grid |
| `TourTile` | `components/tours/tour-tile.tsx` | image-bg poster tile (photo + name) — extract/share with `PopularTours` if clean |
| reuse | — | `ValueProps`, `EnquiryCta`, `ContentHero`-style breadcrumb pattern |

Overview (`marketing/destinations.tsx` / `destinations/region-group.tsx`): retarget tile + "View more"
links to the region pages. **Note:** `DestinationTile` is shared with the **home teaser**, so its link
change (`/destinations/[region]?d=[slug]`) cascades to the homepage too — intended, since per-destination
pages are removed. The home teaser keeps its bento look; only the link target changes.

## Error handling

- Unknown region slug → `notFound()`. `generateStaticParams` pre-renders the 3 regions.
- Region with no tours for a tab → tab still shown, grid shows an empty-state line.
- `?d=` for a destination not in the region → falls back to `All`.

## Testing

- **Unit (Jest, `@tourism/core`)** if a non-trivial region/tour helper is added (e.g. region→tours
  derivation): ordering, slug match, empty. Trivial `.filter` stays inline.
- **Visual:** manual screenshot review at 320/768/1024/1440 during build; e2e in the later motion/e2e pass.

## Conventions

- Tokens-only (`pnpm check:no-hex`); image-forward + Fraunces headings; app imports relative.
- Copy in `@tourism/i18n` (`regionPage` + tab labels); reuse `@tourism/ui` first.
- Per the gate: build → `/gate` (+ no-hex) → review → user reviews → rebase-merge.

## Build order (for the plan)

1. Fixtures helper (`getRegion` / `regionSlugs`) + i18n `regionPage` copy (+ any tour top-ups).
2. `RegionHero` + `RegionIntro` (+ video slot + collage + CTA).
3. `RegionTours` (client tab bar + filtered tile grid) + `TourTile`.
4. `app/destinations/[region]/page.tsx` (compose + `generateStaticParams` + `notFound` + `?d=`), remove
   `[slug]`.
5. Retarget overview links → region pages.
6. Gate + responsive review.
