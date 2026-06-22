# P3 Region Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 3 SSG region pages (`/destinations/[region]`) with a destination-filter tab bar + tour grid, replacing the per-destination `/destinations/[slug]` pages — UI-first with fixtures.

**Architecture:** A `regions.ts` helper derives each region (name + cover + destinations + tours) from the existing `destinations` fixtures via the TDD'd `groupByRegion` (`@tourism/core`). The page composes `RegionHero` + `RegionIntro` + a client `RegionTours` (tab bar filtering an image-poster `TourTile` grid, extracted from `PopularTours`) + reused `ValueProps` + `EnquiryCta`. Overview/home tiles retarget to the region pages.

**Tech Stack:** Next.js 16 (App Router, RSC + one client component), React 19, `@tourism/ui`, `@tourism/tokens`, `@tourism/i18n`, `next/image`.

**Spec:** [docs/06-specs/2026-06-22-p3-region-pages-design.md](../06-specs/2026-06-22-p3-region-pages-design.md)

## Global Constraints

- **Tokens only — no hex.** `pnpm check:no-hex`.
- **Reuse `@tourism/ui` first**; app imports **relative**, not `@/`.
- **Copy in `@tourism/i18n`** (`messages.*`); no inline user-facing strings.
- **UI-first / fixtures:** no real-data wiring; temporary Unsplash imagery via existing `remotePatterns`.
- **Region slugs:** `slugify(region)` → `northern-vietnam` · `central-vietnam` · `southern-vietnam`.
- **Out of scope:** tour detail, booking card, destination landings, vlogs, rich enquiry form.
- Web has **no unit-test harness**; pure logic is TDD'd in `@tourism/core`. The region derivation here is
  composition of the already-tested `groupByRegion`, so it is verified by `build`, not a new unit test.
- Verify web changes with `pnpm nx build @tourism/web` (Next type-checks during build) + `pnpm check:no-hex`.

---

### Task 1: i18n `regionPage` copy + `regions.ts` helper

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts`
- Create: `apps/web/src/lib/regions.ts`

**Interfaces:**
- Produces:
  - `messages.regionPage` with `backToAll`, `introHeading(region)`, `itinerariesCta(region)`, `toursHeading`, `allTab`, `noTours`, and `regions: Record<string, { tagline: string; intro: string }>`.
  - `interface RegionData { name: string; image: string; images: string[]; destinations: { name: string; slug: string }[]; tours: TourCardData[] }`
  - `function regionSlugs(): string[]`
  - `function getRegion(regionSlug: string): RegionData | undefined`

- [ ] **Step 1: Add the i18n namespace**

In `libs/shared/i18n/src/lib/messages.ts`, add after the `destinationDetail` block:

```ts
  // `/destinations/[region]` region pages.
  regionPage: {
    backToAll: 'All destinations',
    introHeading: (region: string) => `The best ${region} tours`,
    itinerariesCta: (region: string) => `${region} itineraries`,
    toursHeading: 'Tours',
    allTab: 'All',
    noTours: 'New tours for this destination are coming soon.',
    regions: {
      'Northern Vietnam': {
        tagline: 'From Sa Pa to Hạ Long Bay — culture and natural wonders in the misty north.',
        intro:
          'Awe-inspiring landscapes of limestone bays and terraced highlands, diverse hill-tribe cultures, and the frontier passes of the far north. Browse our Northern Vietnam tours below, or read our itinerary suggestions.',
      },
      'Central Vietnam': {
        tagline: 'Imperial heritage, lantern-lit old towns and a golden coastline.',
        intro:
          'Wander ancient citadels and UNESCO old towns beside white-sand beaches, and venture into some of the world’s largest caves. Browse our Central Vietnam tours below, or read our itinerary suggestions.',
      },
      'Southern Vietnam': {
        tagline: 'River deltas, island beaches and the restless energy of Sài Gòn.',
        intro:
          'Floating markets and flooded paddies, cosmopolitan cities and tropical islands — the warm, easy-going south. Browse our Southern Vietnam tours below, or read our itinerary suggestions.',
      },
    } as Record<string, { tagline: string; intro: string }>,
  },
```

- [ ] **Step 2: Create the regions helper**

```ts
// apps/web/src/lib/regions.ts
import { groupByRegion } from '@tourism/core';

import type { TourCardData } from '../components/tours/tour-card';
import { destinations } from './destinations.fixtures';
import { slugify } from './slug';

export interface RegionData {
  name: string;
  /** Hero cover (first destination's image). */
  image: string;
  /** Collage images (destinations' covers). */
  images: string[];
  destinations: { name: string; slug: string }[];
  tours: TourCardData[];
}

// Grouped once at module load (composition of the TDD'd core `groupByRegion`).
const groups = groupByRegion(destinations).filter((g) => g.region !== 'Other');

/** Canonical region slugs for `generateStaticParams`. */
export function regionSlugs(): string[] {
  return groups.map((g) => slugify(g.region));
}

/** Derive a region's hero/collage/destinations/tours from the destination fixtures. */
export function getRegion(regionSlug: string): RegionData | undefined {
  const group = groups.find((g) => slugify(g.region) === regionSlug);
  if (!group) return undefined;
  return {
    name: group.region,
    image: group.items[0]?.image ?? '',
    images: group.items.map((d) => d.image),
    destinations: group.items.map((d) => ({ name: d.name, slug: d.slug })),
    tours: group.items.flatMap((d) => d.tours),
  };
}
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx build @tourism/i18n`
Expected: PASS.

```bash
git add libs/shared/i18n/src/lib/messages.ts apps/web/src/lib/regions.ts
git commit -m "feat(i18n,web): region-page copy + regions derivation helper"
```

---

### Task 2: `TourTile` (extract image-poster from `PopularTours`)

**Files:**
- Create: `apps/web/src/components/tours/tour-tile.tsx`
- Modify: `apps/web/src/components/destinations/popular-tours.tsx`

**Interfaces:**
- Consumes: `TourCardData` from `./tour-card`.
- Produces: `function TourTile({ tour }: { tour: TourCardData }): JSX.Element` — image-background poster card (photo + scrim + headline-badge chip + place/duration + title + rating/price), linking to `#tour-${tour.slug}` (placeholder until `/tours/[slug]` exists).

- [ ] **Step 1: Create `TourTile`**

Move the `PopularTourCard` body (and its `formatPrice` helper) from `popular-tours.tsx` into a new file, exported as `TourTile`:

```tsx
// apps/web/src/components/tours/tour-tile.tsx
import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { TourCardData } from './tour-card';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Image-background tour poster tile (photo + overlaid title/place/rating/price). */
export function TourTile({ tour }: { tour: TourCardData }) {
  const t = messages.featuredTours;
  const topBadge = tour.badges[0];

  return (
    <Link
      href={`#tour-${tour.slug}`}
      className="group text-primary-foreground relative block aspect-3/4 overflow-hidden rounded-2xl"
    >
      <Image
        src={tour.image ?? ''}
        alt={tour.title}
        fill
        sizes="(min-width: 1024px) 25vw, 50vw"
        className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
      />
      <div className="from-overlay via-overlay/40 absolute inset-0 bg-linear-to-t to-transparent" />
      {topBadge ? (
        <span className="border-primary-foreground/25 bg-background/15 absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {t.badges[topBadge]}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
        <div className="text-primary-foreground/85 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tracking-wide uppercase">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {tour.destination}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" />
            {tour.durationDays} {t.daysLabel}
          </span>
        </div>
        <h3 className="font-heading line-clamp-2 text-xl leading-tight font-semibold text-balance">
          {tour.title}
        </h3>
        <div className="border-primary-foreground/15 mt-1 flex items-center justify-between gap-2 border-t pt-3">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <StarIcon className="text-rating fill-rating size-4" />
            <span className="font-semibold">{tour.rating.toFixed(1)}</span>
            <span className="text-primary-foreground/70">({tour.reviewCount})</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold">{formatPrice(tour.currency, tour.basePrice)}</span>
            {tour.compareAtPrice ? (
              <span className="text-primary-foreground/60 text-sm line-through">
                {formatPrice(tour.currency, tour.compareAtPrice)}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default TourTile;
```

- [ ] **Step 2: Refactor `PopularTours` to use `TourTile`**

In `popular-tours.tsx`: delete the local `PopularTourCard` + `formatPrice`, import `{ TourTile }` from `../tours/tour-tile`, and render `<TourTile key={tour.slug} tour={tour} />` in the grid. Keep the section header + grid wrapper unchanged.

- [ ] **Step 3: Verify + commit**

Run: `pnpm check:no-hex` · `pnpm nx build @tourism/web`
Expected: PASS; `/destinations` popular strip looks unchanged.

```bash
git add apps/web/src/components/tours/tour-tile.tsx apps/web/src/components/destinations/popular-tours.tsx
git commit -m "refactor(web): extract TourTile poster from PopularTours"
```

---

### Task 3: `RegionHero` + `RegionIntro`

**Files:**
- Create: `apps/web/src/components/destinations/region-hero.tsx`
- Create: `apps/web/src/components/destinations/region-intro.tsx`

**Interfaces:**
- Consumes: `messages.common.home`, `messages.nav.destinations`, `messages.regionPage`.
- Produces:
  - `function RegionHero({ name, image, tagline }: { name: string; image: string; tagline: string })`
  - `function RegionIntro({ name, intro, images, itinerariesHref }: { name: string; intro: string; images: string[]; itinerariesHref: string })`

- [ ] **Step 1: `RegionHero`**

```tsx
// apps/web/src/components/destinations/region-hero.tsx
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

export function RegionHero({ name, image, tagline }: { name: string; image: string; tagline: string }) {
  return (
    <section className="relative isolate flex min-h-80 items-end overflow-hidden lg:min-h-96">
      <Image src={image} alt={name} fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="from-overlay/85 via-overlay/40 absolute inset-0 -z-10 bg-linear-to-t to-transparent" />
      <div className="text-primary-foreground mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <nav
          aria-label="Breadcrumb"
          className="text-primary-foreground/80 mb-3 flex items-center gap-1.5 text-sm"
        >
          <Link href="/" className="hover:text-primary-foreground">
            {messages.common.home}
          </Link>
          <ChevronRightIcon className="size-4" />
          <Link href="/destinations" className="hover:text-primary-foreground">
            {messages.nav.destinations}
          </Link>
          <ChevronRightIcon className="size-4" />
          <span>{name}</span>
        </nav>
        <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">{name}</h1>
        <p className="text-primary-foreground/85 mt-3 max-w-xl text-lg text-pretty">{tagline}</p>
      </div>
    </section>
  );
}

export default RegionHero;
```

- [ ] **Step 2: `RegionIntro`** (heading + accent + video slot + text + CTA + collage)

```tsx
// apps/web/src/components/destinations/region-intro.tsx
import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export function RegionIntro({
  name,
  intro,
  images,
  itinerariesHref,
}: {
  name: string;
  intro: string;
  images: string[];
  itinerariesHref: string;
}) {
  const t = messages.regionPage;
  const collage = images.slice(0, 4);

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Left: heading + accent + video slot + text + CTA */}
        <div className="space-y-5">
          <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">
            {t.introHeading(name)}
          </h2>
          <div className="bg-primary h-1 w-12 rounded-full" />

          {/* Video slot (static poster + play affordance; real embed later) */}
          <div className="bg-foreground/90 relative aspect-video overflow-hidden rounded-xl">
            {images[0] ? (
              <Image src={images[0]} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-80" />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background/90 text-primary flex size-14 items-center justify-center rounded-full">
                <PlayIcon className="size-6" />
              </span>
            </span>
          </div>

          <p className="text-muted-foreground text-lg text-pretty">{intro}</p>
          <Link href={itinerariesHref} className={cn(buttonVariants({ size: 'lg' }))}>
            {t.itinerariesCta(name)}
          </Link>
        </div>

        {/* Right: 2×2 photo collage */}
        <div className="grid grid-cols-2 gap-4">
          {collage.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
              <Image src={src} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RegionIntro;
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm check:no-hex` (no build yet — not imported until Task 5; the check confirms no hex slipped into other files).

```bash
git add apps/web/src/components/destinations/region-hero.tsx apps/web/src/components/destinations/region-intro.tsx
git commit -m "feat(web): RegionHero + RegionIntro (hero, video slot, collage, itineraries CTA)"
```

---

### Task 4: `RegionTours` (client tab bar + filtered grid)

**Files:**
- Create: `apps/web/src/components/destinations/region-tours.tsx`

**Interfaces:**
- Consumes: `TourTile`; `TourCardData`; `messages.regionPage`; `cn` from `@tourism/ui`.
- Produces: `function RegionTours({ destinations, tours, initialDestination }: { destinations: { name: string; slug: string }[]; tours: TourCardData[]; initialDestination?: string })` — `'use client'`. Tab state holds `'all'` or a destination **name**; filters `tours` by `tour.destination`.

- [ ] **Step 1: Create the client component**

```tsx
// apps/web/src/components/destinations/region-tours.tsx
'use client';

import { useState } from 'react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourTile } from '../tours/tour-tile';
import type { TourCardData } from '../tours/tour-card';

const CHIP = 'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors';
const CHIP_ON = 'border-primary bg-primary text-primary-foreground';
const CHIP_OFF = 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30';

export function RegionTours({
  destinations,
  tours,
  initialDestination,
}: {
  destinations: { name: string; slug: string }[];
  tours: TourCardData[];
  initialDestination?: string;
}) {
  const t = messages.regionPage;
  const initialName = destinations.find((d) => d.slug === initialDestination)?.name ?? 'all';
  const [active, setActive] = useState<string>(initialName);

  const filtered = active === 'all' ? tours : tours.filter((tr) => tr.destination === active);

  return (
    <section className="bg-muted/40 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-6 text-2xl font-semibold text-balance md:text-3xl">
          {t.toursHeading}
        </h2>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive('all')}
            className={cn(CHIP, active === 'all' ? CHIP_ON : CHIP_OFF)}
          >
            {t.allTab}
          </button>
          {destinations.map((d) => (
            <button
              type="button"
              key={d.slug}
              onClick={() => setActive(d.name)}
              className={cn(CHIP, active === d.name ? CHIP_ON : CHIP_OFF)}
            >
              {d.name}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {filtered.map((tour) => (
              <TourTile key={tour.slug} tour={tour} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-pretty">{t.noTours}</p>
        )}
      </div>
    </section>
  );
}

export default RegionTours;
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm check:no-hex`

```bash
git add apps/web/src/components/destinations/region-tours.tsx
git commit -m "feat(web): RegionTours client tab bar + filtered tour grid"
```

---

### Task 5: Region route + remove per-destination route

**Files:**
- Create: `apps/web/src/app/destinations/[region]/page.tsx`
- Delete: `apps/web/src/app/destinations/[slug]/page.tsx` (and the `[slug]` folder)

**Interfaces:**
- Consumes: `getRegion`, `regionSlugs` (`../../../lib/regions`); `RegionHero`, `RegionIntro`, `RegionTours`, `ValueProps`, `EnquiryCta`; `messages.regionPage`.

- [ ] **Step 1: Create the region page**

```tsx
// apps/web/src/app/destinations/[region]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { messages } from '@tourism/i18n';

import { RegionHero } from '../../../components/destinations/region-hero';
import { RegionIntro } from '../../../components/destinations/region-intro';
import { RegionTours } from '../../../components/destinations/region-tours';
import { ValueProps } from '../../../components/destinations/value-props';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { getRegion, regionSlugs } from '../../../lib/regions';

export function generateStaticParams() {
  return regionSlugs().map((region) => ({ region }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  const data = getRegion(region);
  if (!data) return { title: 'Region not found' };
  return { title: `${data.name} tours` };
}

export default async function RegionPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { region } = await params;
  const { d } = await searchParams;
  const data = getRegion(region);
  if (!data) notFound();

  const meta = messages.regionPage.regions[data.name];

  return (
    <main>
      <RegionHero name={data.name} image={data.image} tagline={meta?.tagline ?? ''} />
      <RegionIntro
        name={data.name}
        intro={meta?.intro ?? ''}
        images={data.images}
        itinerariesHref="#itineraries"
      />
      <RegionTours destinations={data.destinations} tours={data.tours} initialDestination={d} />
      <ValueProps />
      <EnquiryCta />
    </main>
  );
}
```

- [ ] **Step 2: Remove the per-destination route**

```bash
git rm -r "apps/web/src/app/destinations/[slug]"
```

(The detail-only components `destination-hero.tsx`, `destination-intro.tsx`, `destination-tours.tsx` are now unused — delete them too if nothing else imports them; verify with `grep -rn "destination-hero\|destination-intro\|destination-tours" apps/web/src`.)

- [ ] **Step 3: Verify + commit**

Run: `pnpm check:no-hex` · `pnpm nx build @tourism/web`
Expected: PASS; build shows `● /destinations/[region]` SSG with 3 paths; no `[slug]`.

```bash
git add apps/web/src/app/destinations/
git commit -m "feat(web): /destinations/[region] region pages (SSG); remove per-destination route"
```

---

### Task 6: Retarget overview + home tile links to region pages

**Files:**
- Modify: `apps/web/src/components/destinations/destination-tile.tsx`
- Modify: `apps/web/src/components/destinations/region-group.tsx`

**Interfaces:**
- Consumes: `slugify` (`../../lib/slug`).

- [ ] **Step 1: Point `DestinationTile` at the region page**

In `destination-tile.tsx`, import `slugify` and change the `Link` `href` from `/destinations/${d.slug}` to the destination's region page with the tab pre-selected:

```tsx
import { slugify } from '../../lib/slug';
// ...
href={`/destinations/${slugify(d.region ?? '')}?d=${d.slug}`}
```

(This cascades to the home teaser, which is intended — per-destination pages are gone.)

- [ ] **Step 2: Add a "View all" region link in `RegionGroup`**

In `region-group.tsx`, add a link in the region heading row to the region page (`/destinations/${slugify(region)}`), labelled from `messages.destinationsPage.viewMore`. Keep the existing mosaic.

```tsx
// in the heading block, alongside <h2>:
import Link from 'next/link';
import { slugify } from '../../lib/slug';
// ...
<Link
  href={`/destinations/${slugify(region)}`}
  className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
>
  {messages.destinationsPage.viewMore}
</Link>
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm check:no-hex` · `pnpm nx build @tourism/web`
Expected: PASS; home + overview tiles now link to `/destinations/<region>?d=<slug>`.

```bash
git add apps/web/src/components/destinations/destination-tile.tsx apps/web/src/components/destinations/region-group.tsx
git commit -m "feat(web): retarget destination tiles + region View all to region pages"
```

---

### Task 7: Gate + responsive review

- [ ] **Step 1: Full gate**

Run: `pnpm nx run-many -t lint typecheck test build -p @tourism/core @tourism/i18n @tourism/web`
Expected: all green (the pre-existing `api/hello` lint warning is unrelated).

- [ ] **Step 2: no-hex**

Run: `pnpm check:no-hex` → PASS.

- [ ] **Step 3: Manual responsive review**

Serve (`pnpm nx dev @tourism/web`) and review at 320 / 768 / 1024 / 1440:
`/destinations` (tiles → region pages), `/destinations/northern-vietnam` (hero · intro · **tabs filter the grid** · value props · enquiry), `/destinations/central-vietnam`, `/destinations/southern-vietnam`, an unknown region → 404, and `/destinations/northern-vietnam?d=sa-pa` (Sa Pa tab pre-selected). Capture screenshots for review. **Do not merge** — user reviews first.

---

## Self-Review (author)

- **Spec coverage:** region pages (T5) ✓ · RegionHero/Intro (T3) ✓ · RegionTours tabs+grid (T4) ✓ ·
  TourTile (T2) ✓ · regions helper + i18n (T1) ✓ · overview/home retarget incl. home cascade (T6) ✓ ·
  remove `[slug]` (T5) ✓ · `?d=` pre-select (T4/T5) ✓ · gate/responsive (T7) ✓. Reuse `ValueProps`+`EnquiryCta` ✓.
- **Type consistency:** `RegionData` (T1) ⇄ consumed by the page (T5) and passed to `RegionHero`/`RegionIntro`/`RegionTours` (T3/4); `TourCardData` reused from `tour-card.tsx`; tab state matches `tour.destination` (destination name) ✓.
- **Out of scope honored:** no tour detail, booking, landings, vlogs, rich enquiry, data wiring.
