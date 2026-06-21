# P3 Destinations (overview + destination page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/destinations` region-grouped overview and `/destinations/[slug]` destination page (layout-first, fixtures), modelled on Lily's `tours-in-vietnam` + region pages in the Emerald Heritage brand.

**Architecture:** Pure region-grouping + slug-lookup helpers live in `@tourism/core` (TDD, existing Jest/SWC). Web reads a shared fixtures module typed off a core `DestinationSummary`. A reusable `DestinationTile` (extracted from the home teaser) renders tiles on both home and overview. Two Next app-router routes compose section components; data wiring to the live API is deferred (plan #6).

**Tech Stack:** Next.js 16 (app router, RSC), React 19, `@tourism/ui` (Base UI / shadcn), `@tourism/tokens`, `@tourism/i18n`, `next/image`, Jest + SWC (core tests).

**Spec:** [docs/06-specs/2026-06-21-p3-destinations-design.md](../06-specs/2026-06-21-p3-destinations-design.md)

## Global Constraints

- **Tokens only — no hex / no raw rainbow.** Enforced by `pnpm check:no-hex` (`node tools/check-no-hex.mjs`).
- **Reuse `@tourism/ui` first**; Base UI `Button` is the primitive (`render` prop, no `asChild`).
- **App imports are relative**, not `@/`.
- **EN-only** (ADR-0005); all user-facing copy in `@tourism/i18n` (`libs/shared/i18n/src/lib/messages.ts`).
- **Module boundaries enforced** (`eslint.config.mjs`): `scope:web` may import `scope:shared`; never the reverse.
- **Inspiration tier** surfaces are image-forward; headings use the Fraunces serif (`font-heading`).
- Temporary **Unsplash** imagery via existing `next/image` `remotePatterns` (review only).
- Commits: Conventional Commits, no AI attribution.
- Region canonical strings + order: `Northern Vietnam` → `Central Vietnam` → `Southern Vietnam`.

---

### Task 1: Core region/slug helpers + `DestinationSummary` type (TDD)

**Files:**
- Create: `libs/shared/core/src/lib/destinations/destinations.ts`
- Create: `libs/shared/core/src/lib/destinations/destinations.spec.ts`
- Modify: `libs/shared/core/src/index.ts` (add export)

**Interfaces:**
- Produces:
  - `interface DestinationSummary { slug: string; name: string; country: string; region: string | null; description: string | null; tourCount: number; }`
  - `const REGION_ORDER: readonly string[]` = `['Northern Vietnam','Central Vietnam','Southern Vietnam']`
  - `function groupByRegion<T extends { region: string | null }>(items: readonly T[], order?: readonly string[]): { region: string; items: T[] }[]`
  - `function getBySlug<T extends { slug: string }>(items: readonly T[], slug: string): T | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// libs/shared/core/src/lib/destinations/destinations.spec.ts
import { REGION_ORDER, groupByRegion, getBySlug } from './destinations.js';

type Row = { slug: string; region: string | null };
const rows: Row[] = [
  { slug: 'hoi-an', region: 'Central Vietnam' },
  { slug: 'ha-long-bay', region: 'Northern Vietnam' },
  { slug: 'mekong-delta', region: 'Southern Vietnam' },
  { slug: 'sa-pa', region: 'Northern Vietnam' },
  { slug: 'mystery', region: null },
];

describe('REGION_ORDER', () => {
  it('is North → Central → South', () => {
    expect(REGION_ORDER).toEqual(['Northern Vietnam', 'Central Vietnam', 'Southern Vietnam']);
  });
});

describe('groupByRegion', () => {
  it('groups and orders N→C→S with unknown/null last', () => {
    const groups = groupByRegion(rows);
    expect(groups.map((g) => g.region)).toEqual([
      'Northern Vietnam', 'Central Vietnam', 'Southern Vietnam', 'Other',
    ]);
  });

  it('keeps input order stable within a group', () => {
    const groups = groupByRegion(rows);
    const north = groups.find((g) => g.region === 'Northern Vietnam');
    expect(north?.items.map((r) => r.slug)).toEqual(['ha-long-bay', 'sa-pa']);
  });

  it('returns [] for empty input', () => {
    expect(groupByRegion([])).toEqual([]);
  });
});

describe('getBySlug', () => {
  it('finds a matching row', () => {
    expect(getBySlug(rows, 'sa-pa')?.region).toBe('Northern Vietnam');
  });
  it('returns undefined when missing', () => {
    expect(getBySlug(rows, 'nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @tourism/core`
Expected: FAIL — cannot find module `./destinations.js` / exports undefined.

- [ ] **Step 3: Write minimal implementation**

```ts
// libs/shared/core/src/lib/destinations/destinations.ts

/** Listing shape the Destinations API will eventually return (web extends it with editorial fields). */
export interface DestinationSummary {
  slug: string;
  name: string;
  country: string;
  region: string | null;
  description: string | null;
  tourCount: number;
}

/** Canonical region buckets, north → south. */
export const REGION_ORDER: readonly string[] = [
  'Northern Vietnam',
  'Central Vietnam',
  'Southern Vietnam',
];

/** Label for items whose region is null or not in `order`. */
const OTHER_REGION = 'Other';

/**
 * Group items by `region`, ordered by `order` (default {@link REGION_ORDER}).
 * Unknown/null regions collapse into a trailing "Other" group. Input order is
 * preserved within each group. Empty input → empty array.
 */
export function groupByRegion<T extends { region: string | null }>(
  items: readonly T[],
  order: readonly string[] = REGION_ORDER,
): { region: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = item.region && order.includes(item.region) ? item.region : OTHER_REGION;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  const ordered = [...order, OTHER_REGION];
  return ordered
    .filter((region) => buckets.has(region))
    .map((region) => ({ region, items: buckets.get(region) as T[] }));
}

/** Find the first item whose `slug` matches. */
export function getBySlug<T extends { slug: string }>(
  items: readonly T[],
  slug: string,
): T | undefined {
  return items.find((item) => item.slug === slug);
}
```

- [ ] **Step 4: Add the barrel export**

In `libs/shared/core/src/index.ts` add:

```ts
export * from './lib/destinations/destinations.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm nx test @tourism/core`
Expected: PASS (all 6 assertions).

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm nx typecheck @tourism/core`

```bash
git add libs/shared/core/src/lib/destinations/ libs/shared/core/src/index.ts
git commit -m "feat(core): region grouping + slug helpers for destinations"
```

---

### Task 2: Web fixtures (shared view-model)

**Files:**
- Create: `apps/web/src/lib/destinations.fixtures.ts`

**Interfaces:**
- Consumes: `DestinationSummary` from `@tourism/core`; `TourCardData` from `../components/tours/tour-card`.
- Produces:
  - `type DestinationTileVM = DestinationSummary & { tagline: string; image: string; intro: string; gallery: string[]; tours: TourCardData[]; span?: string; }`
  - `const destinations: DestinationTileVM[]` (6 entries: ha-long-bay, sa-pa, hoi-an, hue, mekong-delta, ho-chi-minh-city — same slugs/regions as the current home section).
  - `const popularTours: TourCardData[]` (3–4 entries for the overview strip).

- [ ] **Step 1: Create the fixtures module**

Port the 6 destinations from `apps/web/src/components/marketing/destinations.tsx` (same `slug`, `name`,
`region`, `tagline`, `tourCount`, `image`, `span`), adding `country: 'Vietnam'`, a 2–3 sentence
editorial `intro`, a `gallery` of 2–3 Unsplash URLs, and a `tours: TourCardData[]` list (2–4 per
destination, reusing the `img()` Unsplash helper + the `TourCardData` shape). Keep the `img()` helper
local. Export `destinations` and `popularTours`.

```ts
// apps/web/src/lib/destinations.fixtures.ts
import type { DestinationSummary } from '@tourism/core';
import type { TourCardData } from '../components/tours/tour-card';

export type DestinationTileVM = DestinationSummary & {
  tagline: string;
  image: string;
  intro: string;
  gallery: string[];
  tours: TourCardData[];
  span?: string;
};

const img = (id: string) => `https://images.unsplash.com/${id}?w=1100&q=70&auto=format&fit=crop`;

export const destinations: DestinationTileVM[] = [
  // ...6 entries; example below, fill the rest from the home section + brand copy
  {
    slug: 'ha-long-bay',
    name: 'Hạ Long Bay',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'A UNESCO seascape of limestone karsts rising from emerald water.',
    tourCount: 8,
    tagline: 'Emerald waters, limestone giants',
    image: img('photo-1528127269322-539801943592'),
    intro:
      'Glide past thousands of karst islands on an overnight junk, kayak into hidden lagoons, and wake to mist over the bay. Our Hạ Long journeys pair the headline cruise with quieter corners most itineraries miss.',
    gallery: [img('photo-1573790387438-4da905039392'), img('photo-1555921015-5532091f6026')],
    span: 'lg:col-span-2 lg:row-span-2',
    tours: [
      {
        slug: 'ha-long-bay-2d1n',
        title: 'Hạ Long Bay 2 Days 1 Night',
        destination: 'Hạ Long Bay',
        durationDays: 2,
        basePrice: 320,
        compareAtPrice: 390,
        currency: 'USD',
        rating: 4.8,
        reviewCount: 124,
        badges: ['BEST_VALUE'],
        image: img('photo-1528127269322-539801943592'),
      },
    ],
  },
  // sa-pa, hoi-an, hue, mekong-delta, ho-chi-minh-city ...
];

export const popularTours: TourCardData[] = [
  // 3–4 cross-region highlights, reusing the TourCardData shape
];
```

- [ ] **Step 2: Typecheck**

Run: `pnpm nx typecheck @tourism/web`
Expected: PASS (fixtures satisfy `DestinationTileVM` + `TourCardData`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/destinations.fixtures.ts
git commit -m "feat(web): shared destinations fixtures (view-model over core DestinationSummary)"
```

---

### Task 3: Extract `DestinationTile`; refactor home to use it

**Files:**
- Create: `apps/web/src/components/destinations/destination-tile.tsx`
- Modify: `apps/web/src/components/marketing/destinations.tsx`

**Interfaces:**
- Consumes: `DestinationTileVM` from `../../lib/destinations.fixtures`.
- Produces: `function DestinationTile({ destination, className }: { destination: DestinationTileVM; className?: string }): JSX.Element` — renders the image + scrim + name + tagline + tourCount, wrapped in a `next/link` to `/destinations/{slug}`. Uses `destination.span` when present (home bento), ignored when `className` overrides.

- [ ] **Step 1: Create `DestinationTile`**

Move the inner `<a>` tile markup from `marketing/destinations.tsx` (lines ~47–77) into the new
component. Replace the `#destination-${slug}` anchor with a `next/link` `href={`/destinations/${destination.slug}`}`.
Keep the existing classes/scrim/label exactly (no visual change). Pull the label strings from
`messages.destinations.toursLabel` as today.

```tsx
// apps/web/src/components/destinations/destination-tile.tsx
import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';
import type { DestinationTileVM } from '../../lib/destinations.fixtures';

export function DestinationTile({
  destination: d,
  className,
}: {
  destination: DestinationTileVM;
  className?: string;
}) {
  const t = messages.destinations;
  return (
    <Link
      href={`/destinations/${d.slug}`}
      className={cn(
        'group relative block aspect-4/3 overflow-hidden rounded-xl lg:aspect-auto lg:h-full',
        className ?? d.span,
      )}
    >
      <Image
        src={d.image}
        alt={d.name}
        fill
        sizes="(min-width: 1024px) 50vw, 50vw"
        className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
      />
      <div className="from-overlay absolute inset-0 bg-linear-to-t to-transparent" />
      <div className="text-primary-foreground absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
        <h3 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h3>
        <span className="text-primary-foreground/85 text-xs tracking-widest uppercase">{d.tagline}</span>
        <span className="text-primary-foreground/70 text-xs">
          {d.tourCount} {t.toursLabel}
        </span>
      </div>
    </Link>
  );
}

export default DestinationTile;
```

- [ ] **Step 2: Refactor the home section to consume it**

In `apps/web/src/components/marketing/destinations.tsx`: delete the local `DestinationTile` type +
inline `destinations` fixture, import `{ destinations }` from `../../lib/destinations.fixtures` and
`{ DestinationTile }` from `../destinations/destination-tile`, and render
`{destinations.map((d) => <DestinationTile key={d.slug} destination={d} />)}` inside the existing bento
grid wrapper. Keep the section header + "View all" button (point "View all" `href` to `/destinations`).

- [ ] **Step 3: Verify home renders + no-hex + typecheck**

Run: `pnpm check:no-hex`
Run: `pnpm nx typecheck @tourism/web`
Run: `pnpm nx build @tourism/web` (confirms the home route still compiles)
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/destinations/destination-tile.tsx apps/web/src/components/marketing/destinations.tsx
git commit -m "refactor(web): extract DestinationTile, share with home teaser"
```

---

### Task 4: i18n copy + header nav link

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts`
- Modify: `apps/web/src/components/layout/site-header.tsx`

**Interfaces:**
- Produces: `messages.destinationsPage` (overview) + `messages.destinationDetail` (detail) namespaces.

- [ ] **Step 1: Add copy namespaces**

In `messages.ts` add (EN-only), near the existing `destinations` namespace:

```ts
  destinationsPage: {
    heroTitle: 'Explore Vietnam by destination',
    heroSubtitle: 'From the misty north to the Mekong south — choose where your journey begins.',
    regionHeading: (region: string) => `Top destinations in ${region}`,
    popularHeading: 'Most popular journeys',
    popularSubtitle: 'Traveller favourites across the country.',
  },
  destinationDetail: {
    toursHeading: (name: string) => `Tours in ${name}`,
    noTours: 'New journeys for this destination are coming soon.',
    valuePropsHeading: "We've got you covered",
    backToAll: 'All destinations',
  },
```

- [ ] **Step 2: Point the header at the real route**

In `site-header.tsx` change the Destinations entries from `#destinations` to `/destinations` (the flat
nav array entry + the desktop `<a href="#destinations">`). Leave other anchors untouched (their pages
land in later tasks).

- [ ] **Step 3: Typecheck both projects + commit**

Run: `pnpm nx typecheck @tourism/i18n @tourism/web`

```bash
git add libs/shared/i18n/src/lib/messages.ts apps/web/src/components/layout/site-header.tsx
git commit -m "feat(i18n,web): destinations page copy + header route link"
```

---

### Task 5: Overview route (`/destinations`)

**Files:**
- Create: `apps/web/src/components/destinations/destinations-hero.tsx`
- Create: `apps/web/src/components/destinations/region-group.tsx`
- Create: `apps/web/src/components/destinations/popular-tours.tsx`
- Create: `apps/web/src/app/destinations/page.tsx`

**Interfaces:**
- Consumes: `destinations`, `popularTours` (fixtures); `groupByRegion` (`@tourism/core`); `DestinationTile`; `TourCard`; `EnquiryCta`; `messages.destinationsPage`.
- Produces: route `/destinations`.

- [ ] **Step 1: `DestinationsHero`**

Full-bleed `next/image` (eager + `fetchpriority="high"`) + centred `messages.destinationsPage.heroTitle`
(`font-heading`) + subtitle over a scrim. Mirror the home `Hero` structure/classes for consistency
(read `apps/web/src/components/marketing/hero.tsx` first; reuse its scrim + container tokens).

- [ ] **Step 2: `RegionGroup`**

```tsx
// apps/web/src/components/destinations/region-group.tsx
import { DestinationTile } from './destination-tile';
import type { DestinationTileVM } from '../../lib/destinations.fixtures';
import { messages } from '@tourism/i18n';

export function RegionGroup({ region, items }: { region: string; items: DestinationTileVM[] }) {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-8 text-2xl font-semibold text-balance md:text-3xl">
          {messages.destinationsPage.regionHeading(region)}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[14rem]">
          {items.map((d) => (
            <DestinationTile key={d.slug} destination={d} className="" />
          ))}
        </div>
      </div>
    </section>
  );
}
```

(Passing `className=""` makes overview tiles uniform — ignores the home bento `span`.)

- [ ] **Step 3: `PopularTours`**

Heading (`messages.destinationsPage.popularHeading`) + subtitle + a responsive grid of
`<TourCard tour={...} />` over `popularTours`. Reuse the grid classes from the home featured section
(read `apps/web/src/components/marketing/featured-packages.tsx` first).

- [ ] **Step 4: Overview page**

```tsx
// apps/web/src/app/destinations/page.tsx
import { groupByRegion } from '@tourism/core';
import { DestinationsHero } from '../../components/destinations/destinations-hero';
import { RegionGroup } from '../../components/destinations/region-group';
import { PopularTours } from '../../components/destinations/popular-tours';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';
import { destinations, popularTours } from '../../lib/destinations.fixtures';

export const metadata = { title: 'Vietnam destinations' };

export default function DestinationsPage() {
  const groups = groupByRegion(destinations);
  return (
    <main>
      <DestinationsHero />
      {groups.map((g) => (
        <RegionGroup key={g.region} region={g.region} items={g.items} />
      ))}
      <PopularTours tours={popularTours} />
      <EnquiryCta />
    </main>
  );
}
```

- [ ] **Step 5: Verify**

Run: `pnpm check:no-hex`
Run: `pnpm nx build @tourism/web`
Expected: PASS; `/destinations` route compiles.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/destinations/ apps/web/src/app/destinations/page.tsx
git commit -m "feat(web): /destinations overview (hero + region groups + popular tours)"
```

---

### Task 6: Destination page route (`/destinations/[slug]`)

**Files:**
- Create: `apps/web/src/components/destinations/destination-hero.tsx`
- Create: `apps/web/src/components/destinations/destination-intro.tsx`
- Create: `apps/web/src/components/destinations/destination-tours.tsx`
- Create: `apps/web/src/components/destinations/value-props.tsx`
- Create: `apps/web/src/app/destinations/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getBySlug` (`@tourism/core`); `destinations` (fixtures); `TourCard`, `EnquiryCta`; `messages.destinationDetail`; `notFound` from `next/navigation`.
- Produces: route `/destinations/[slug]` with `generateStaticParams`.

- [ ] **Step 1: `DestinationHero`, `DestinationIntro`, `DestinationTours`, `ValueProps`**

- `DestinationHero({ destination })` — full-bleed cover + `font-heading` name + a small region/country
  label + a `back to all` link (`/destinations`, `messages.destinationDetail.backToAll`).
- `DestinationIntro({ destination })` — 2-col: `description`/`intro` copy left, `gallery` thumbnails right.
- `DestinationTours({ name, tours })` — `messages.destinationDetail.toursHeading(name)` + `TourCard`
  grid; render `messages.destinationDetail.noTours` when `tours.length === 0`.
- `ValueProps` — compact 3-up (luxury transfers / unique experiences / honest advice) using tokens +
  `lucide-react` icons; static copy from `messages.destinationDetail.valuePropsHeading` + inline items.

- [ ] **Step 2: Destination page with static params + 404**

```tsx
// apps/web/src/app/destinations/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getBySlug } from '@tourism/core';
import { DestinationHero } from '../../../components/destinations/destination-hero';
import { DestinationIntro } from '../../../components/destinations/destination-intro';
import { DestinationTours } from '../../../components/destinations/destination-tours';
import { ValueProps } from '../../../components/destinations/value-props';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { destinations } from '../../../lib/destinations.fixtures';

export function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = getBySlug(destinations, slug);
  if (!destination) notFound();
  return (
    <main>
      <DestinationHero destination={destination} />
      <DestinationIntro destination={destination} />
      <DestinationTours name={destination.name} tours={destination.tours} />
      <ValueProps />
      <EnquiryCta />
    </main>
  );
}
```

(Note: Next.js 16 `params` is a Promise — `await` it. Confirm against the home route's signature first.)

- [ ] **Step 3: Verify build + no-hex + a known/unknown slug**

Run: `pnpm check:no-hex`
Run: `pnpm nx build @tourism/web`
Expected: PASS; `generateStaticParams` pre-renders the 6 known slugs; an unknown slug → 404.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/destinations/ apps/web/src/app/destinations/
git commit -m "feat(web): /destinations/[slug] destination page (hero/intro/tours/value-props)"
```

---

### Task 7: Gate + responsive review

- [ ] **Step 1: Full gate**

Run: `pnpm nx run-many -t lint typecheck test build -p @tourism/core @tourism/i18n @tourism/web`
Expected: all green. Fix any lint/type fallout before proceeding.

- [ ] **Step 2: no-hex**

Run: `pnpm check:no-hex`
Expected: PASS.

- [ ] **Step 3: Manual responsive review**

Serve (`pnpm nx dev @tourism/web`) and eyeball `/destinations` + a `/destinations/[slug]` at 320 / 768 /
1024 / 1440: no overflow, tiles legible, hero scrim contrast OK, tours grid wraps. Capture screenshots
for the review.

- [ ] **Step 4: Hand off for user review** (per CLAUDE.md: user reviews before merge). Do not merge.

---

## Self-Review (author)

- **Spec coverage:** overview route (T5) ✓ · destination route + 404 + static params (T6) ✓ ·
  `DestinationTile` extraction + home refactor (T3) ✓ · shared fixtures (T2) ✓ · core helpers w/ TDD
  (T1) ✓ · popular-tours strip (T5) ✓ · i18n + nav (T4) ✓ · gate/responsive (T7) ✓.
- **Type consistency:** `DestinationSummary` (T1) ⇄ `DestinationTileVM extends DestinationSummary` (T2)
  ⇄ consumed by `DestinationTile`/pages (T3/5/6); `groupByRegion`/`getBySlug` generic signatures match
  call sites; `TourCardData` reused verbatim from `tour-card.tsx`.
- **Open verifications for the implementer (flagged inline):** Next 16 `params` Promise signature
  (mirror the home/existing route); exact reuse classes from `hero.tsx` / `featured-packages.tsx`.
