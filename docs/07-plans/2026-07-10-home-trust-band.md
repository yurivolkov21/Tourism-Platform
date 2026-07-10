# Home Trust Band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home (and About) "Built with" coloured tech-stack marquee with a credible, on-brand **dark trust band**: real live stats (`23 curated tours · 16 destinations · 4.4★ average rating`) + a monochrome, self-hosted payment-method marquee (`Visa · Mastercard · American Express · PayPal · Stripe`) + a security caption.

**Architecture:** One presentational `TrustBand` client component (dark-forced section) fed real stats computed server-side. Stats come from existing public list endpoints (`tours`/`destinations` → `meta.total`) plus one new tiny public endpoint `GET /reviews/summary` (site-wide approved-review count + average). Payment logos are self-hosted SVGs, tinted to a single token ink via CSS `mask`, scrolled by the existing shared `Marquee`.

**Tech Stack:** NestJS 11 + Prisma (BE endpoint), Next.js 16 RSC + `@tourism/ui`/`@tourism/tokens` + `@tourism/i18n` (FE), Jest/`@swc/jest` (tests).

## Global Constraints

- Straight quotes only; Conventional Commits; do not reformat lines a task doesn't name.
- **No hex colours** in authored code — semantic Tailwind tokens only (`bg-background`, `text-foreground`, `text-primary`, `text-muted-foreground`, `border-border`). The band forces the dark palette with a `dark` wrapper class (no raw hex). `tools/check-no-hex.mjs` fails on hex in `.css`.
- **English-only** copy, centralized in `@tourism/i18n` (`libs/shared/i18n/src/lib/messages.ts`).
- **TDD on pure logic** (helpers, service aggregate); target ≥80% on new logic.
- **Honesty:** no fabricated numbers or logos. Stats are live from the DB. Payment methods = only what checkout accepts: cards via Stripe (Visa/Mastercard/Amex) + PayPal; "Stripe" shown as processor. No Apple/Google Pay/Discover.
- Reuse the shared `Marquee` (`apps/web/src/components/marketing/marquee.tsx`) — it already handles `pauseOnHover` + `prefers-reduced-motion`.
- Run `/gate` (lint + typecheck + test + build) before declaring green. Hand gate commands to the user to run.

---

### Task 1: Public reviews-summary endpoint (BE)

Site-wide approved-review count + average rating. There is no site-wide aggregate today (`reviews.service.ts` only aggregates per-tour), so add one.

**Files:**
- Modify: `apps/api/src/modules/reviews/reviews.service.ts` (add `summarize()`)
- Create: `apps/api/src/modules/reviews/dto/review-summary.dto.ts`
- Modify: `apps/api/src/modules/reviews/reviews.controller.ts` (add `@Public() GET /reviews/summary`)
- Test: `apps/api/src/modules/reviews/reviews.service.spec.ts` (add cases)

**Interfaces:**
- Produces: `ReviewsService.summarize(): Promise<{ count: number; averageRating: number | null }>`
- Produces HTTP: `GET /api/v1/reviews/summary` → envelope `{ data: { count: number; averageRating: number | null }, error: null }`

- [ ] **Step 1: Write the failing service test**

Add to `apps/api/src/modules/reviews/reviews.service.spec.ts`. Match the existing mocking style in that file (it mocks `prisma.review.aggregate`/`count`). Add a `describe('summarize')`:

```ts
describe('summarize', () => {
  it('returns site-wide approved count + rounded average', async () => {
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.375 },
      _count: { _all: 26 },
    } as never);
    const result = await service.summarize();
    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: { isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    expect(result).toEqual({ count: 26, averageRating: 4.4 });
  });

  it('returns null averageRating and 0 count when there are no approved reviews', async () => {
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { _all: 0 },
    } as never);
    const result = await service.summarize();
    expect(result).toEqual({ count: 0, averageRating: null });
  });
});
```

(If the existing spec's `prisma` mock lacks a jest-fn `aggregate`, extend the mock factory in that file to include `aggregate: jest.fn()` — do not reformat unrelated lines.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @tourism/api --testPathPatterns reviews.service`
Expected: FAIL — `service.summarize is not a function`.

- [ ] **Step 3: Implement `summarize()`**

Add to `apps/api/src/modules/reviews/reviews.service.ts` (near the other read methods). Round to 1 decimal place:

```ts
/** Site-wide approved-review count + mean rating (1 dp), for the marketing trust band. */
async summarize(): Promise<{ count: number; averageRating: number | null }> {
  const aggregate = await this.prisma.review.aggregate({
    where: { isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const avg = aggregate._avg.rating;
  return {
    count: aggregate._count._all,
    averageRating: avg === null ? null : Math.round(avg * 10) / 10,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test @tourism/api --testPathPatterns reviews.service`
Expected: PASS.

- [ ] **Step 5: Add the DTO**

Create `apps/api/src/modules/reviews/dto/review-summary.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

/** Site-wide approved-review aggregate for the marketing trust band. */
export class ReviewSummaryDto {
  @ApiProperty({ example: 26, description: 'Number of approved reviews' })
  count!: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 4.4,
    description: 'Mean rating across approved reviews (1 dp); null when none.',
  })
  averageRating!: number | null;
}
```

- [ ] **Step 6: Add the public controller route**

In `apps/api/src/modules/reviews/reviews.controller.ts`, import the DTO and add BELOW the `featured()` handler (keep it a `@Public()` GET, mirroring `featured`):

```ts
import { ReviewSummaryDto } from './dto/review-summary.dto';
```
```ts
@Public()
@Get('summary')
@ApiOperation({ summary: 'Site-wide approved-review count + average rating' })
@ApiOkResponse({ type: ReviewSummaryDto, description: 'Approved-review aggregate' })
summary(): Promise<{ count: number; averageRating: number | null }> {
  return this.reviewsService.summarize();
}
```

- [ ] **Step 7: Verify the route compiles + typecheck**

Run: `pnpm nx typecheck @tourism/api`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/reviews/reviews.service.ts apps/api/src/modules/reviews/reviews.controller.ts apps/api/src/modules/reviews/dto/review-summary.dto.ts apps/api/src/modules/reviews/reviews.service.spec.ts
git commit -m "feat(api): public GET /reviews/summary (site-wide count + avg rating)"
```

---

### Task 2: FE stats fetch + pure builder (web)

Fetch the three real numbers and shape them into display rows. Follows the existing plain-`fetch` pattern used by `reviews.ts` for the untyped route, and the typed client for the list totals.

**Files:**
- Create: `apps/web/src/lib/api/trust-stats.ts`
- Create: `apps/web/src/lib/trust-band.ts` (pure builder)
- Test: `apps/web/src/lib/trust-band.spec.ts`

**Interfaces:**
- Produces: `type TrustStats = { tours: number; destinations: number; reviewCount: number; averageRating: number | null }`
- Produces: `fetchTrustStats(): Promise<TrustStats>` (returns zeros/null on error — never throws)
- Produces: `type TrustStat = { value: string; label: string }`
- Produces: `buildTrustStats(stats: TrustStats, labels: { tours: string; destinations: string; rating: string }): TrustStat[]`

- [ ] **Step 1: Write the failing builder test**

Create `apps/web/src/lib/trust-band.spec.ts`:

```ts
import { buildTrustStats } from './trust-band';

const labels = { tours: 'Curated tours', destinations: 'Destinations', rating: 'Average rating' };

describe('buildTrustStats', () => {
  it('formats tours + destinations as plain counts and rating with a star', () => {
    const rows = buildTrustStats(
      { tours: 23, destinations: 16, reviewCount: 26, averageRating: 4.4 },
      labels,
    );
    expect(rows).toEqual([
      { value: '23', label: 'Curated tours' },
      { value: '16', label: 'Destinations' },
      { value: '4.4★', label: 'Average rating' },
    ]);
  });

  it('keeps one decimal place on whole-number ratings', () => {
    const rows = buildTrustStats(
      { tours: 10, destinations: 5, reviewCount: 4, averageRating: 5 },
      labels,
    );
    expect(rows[2]).toEqual({ value: '5.0★', label: 'Average rating' });
  });

  it('omits the rating row when there are no reviews (averageRating null)', () => {
    const rows = buildTrustStats(
      { tours: 10, destinations: 5, reviewCount: 0, averageRating: null },
      labels,
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.label)).toEqual(['Curated tours', 'Destinations']);
  });

  it('omits count rows that are zero (so a cold/empty API never shows "0 tours")', () => {
    const rows = buildTrustStats(
      { tours: 0, destinations: 0, reviewCount: 0, averageRating: null },
      labels,
    );
    expect(rows).toEqual([]);
  });
});
```

Fix the first test's expectation to the real value `4.4★` (the `4.8★` above is deliberately wrong so the test fails first):

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @tourism/web --testPathPatterns trust-band`
Expected: FAIL (`buildTrustStats` not found, and the `4.8★` mismatch).

- [ ] **Step 3: Implement the pure builder**

Create `apps/web/src/lib/trust-band.ts`:

```ts
export type TrustStats = {
  tours: number;
  destinations: number;
  reviewCount: number;
  averageRating: number | null;
};

export type TrustStat = { value: string; label: string };

/**
 * Shapes the live counts into display rows for the trust band. Zero counts and a
 * null rating are dropped so a cold or empty API never renders "0 tours" / no star.
 */
export function buildTrustStats(
  stats: TrustStats,
  labels: { tours: string; destinations: string; rating: string },
): TrustStat[] {
  const rows: TrustStat[] = [];
  if (stats.tours > 0) rows.push({ value: String(stats.tours), label: labels.tours });
  if (stats.destinations > 0)
    rows.push({ value: String(stats.destinations), label: labels.destinations });
  if (stats.averageRating !== null)
    rows.push({ value: `${stats.averageRating.toFixed(1)}★`, label: labels.rating });
  return rows;
}
```

Now correct Step 1's first-test expectation `'4.8★'` → `'4.4★'` and re-run.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test @tourism/web --testPathPatterns trust-band`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Implement the fetch layer**

Create `apps/web/src/lib/api/trust-stats.ts`. Tours/destinations totals via the typed client's envelope `meta.total`; the reviews summary via plain `fetch` (mirrors `reviews.ts`, whose route isn't in the typed client):

```ts
import type { TrustStats } from '../trust-band';
import { getApiClient } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function count(path: '/api/v1/tours' | '/api/v1/destinations'): Promise<number> {
  const api = getApiClient();
  const { data } = await api.GET(path, { params: { query: { pageSize: 1 } } });
  return (data as unknown as { meta?: { total?: number } }).meta?.total ?? 0;
}

async function reviewSummary(): Promise<{ count: number; averageRating: number | null }> {
  const res = await fetch(`${API_BASE}/api/v1/reviews/summary`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { count: 0, averageRating: null };
  const json = (await res.json()) as {
    data?: { count?: number; averageRating?: number | null };
  };
  return {
    count: json.data?.count ?? 0,
    averageRating: json.data?.averageRating ?? null,
  };
}

/** Live trust-band numbers. Returns zeros/null on any error so the band never breaks the page. */
export async function fetchTrustStats(): Promise<TrustStats> {
  try {
    const [tours, destinations, reviews] = await Promise.all([
      count('/api/v1/tours'),
      count('/api/v1/destinations'),
      reviewSummary(),
    ]);
    return {
      tours,
      destinations,
      reviewCount: reviews.count,
      averageRating: reviews.averageRating,
    };
  } catch {
    return { tours: 0, destinations: 0, reviewCount: 0, averageRating: null };
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm nx typecheck @tourism/web`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/api/trust-stats.ts apps/web/src/lib/trust-band.ts apps/web/src/lib/trust-band.spec.ts
git commit -m "feat(web): live trust-band stats fetch + pure row builder (TDD)"
```

---

### Task 3: i18n copy + self-hosted payment logos + PaymentMarquee

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts` (add `trustBand`)
- Create: `apps/web/public/logos/pay/visa.svg`, `mastercard.svg`, `amex.svg`, `paypal.svg`, `stripe.svg`
- Create: `apps/web/src/components/marketing/payment-marquee.tsx`

**Interfaces:**
- Consumes: shared `Marquee` from `../marketing/marquee` (props `pauseOnHover`, `className`).
- Produces: `messages.trustBand` = `{ eyebrow: string; stats: { tours: string; destinations: string; rating: string }; security: string }`
- Produces: `PaymentMarquee` (no props) — the monochrome logo strip + security caption.

- [ ] **Step 1: Add the i18n copy**

In `libs/shared/i18n/src/lib/messages.ts`, **add** a new `trustBand` block next to the existing `techCloud` block (do not delete `techCloud` or `about.builtWith` yet — their consumers are still compiled until Task 5, so removing them now breaks typecheck):

```ts
  // Home + About trust band (real live stats + accepted payment methods).
  trustBand: {
    eyebrow: 'Why travelers choose Nexora',
    stats: {
      tours: 'Curated tours',
      destinations: 'Destinations',
      rating: 'Average rating',
    },
    security: 'Every booking secured by Stripe & PayPal · SSL encrypted',
  },
```

Both `techCloud` and `about.builtWith` are removed in Task 5, after their consumers are deleted.

- [ ] **Step 2: Add the payment SVGs (self-hosted)**

Create five monochrome brand SVGs under `apps/web/public/logos/pay/`. Source the official single-path marks from simple-icons (`https://simpleicons.org` — the same source the old CDN used): `visa`, `mastercard`, `americanexpress`, `paypal`, `stripe`. Save them as `visa.svg`, `mastercard.svg`, `amex.svg`, `paypal.svg`, `stripe.svg`. Colour inside the SVG is irrelevant — the component tints them via CSS `mask`. Each file is a standard `<svg viewBox="0 0 24 24"><path d="…"/></svg>` (simple-icons format).

Acquire without hand-typing paths (they are long): `pnpm dlx simple-icons@latest` is not a CLI; instead copy each file from `node_modules/simple-icons/icons/<slug>.svg` after `pnpm add -D -w simple-icons`, OR download from `https://cdn.simpleicons.org/<slug>` and save. Verify each saved file begins with `<svg` and contains a `<path`.

- [ ] **Step 3: Build PaymentMarquee**

Create `apps/web/src/components/marketing/payment-marquee.tsx`. Tint via CSS `mask` + a token ink (`bg-muted-foreground`), hover → `bg-foreground`; reuse `Marquee`:

```tsx
import { messages } from '@tourism/i18n';
import { Marquee } from './marquee';

const PAYMENTS = [
  { name: 'Visa', file: 'visa' },
  { name: 'Mastercard', file: 'mastercard' },
  { name: 'American Express', file: 'amex' },
  { name: 'PayPal', file: 'paypal' },
  { name: 'Stripe', file: 'stripe' },
] as const;

/** Monochrome, self-hosted payment marks scrolled by the shared Marquee, + a security caption. */
export function PaymentMarquee() {
  return (
    <div>
      <div className="relative overflow-hidden">
        <Marquee pauseOnHover className="[--duration:36s] p-0">
          {PAYMENTS.map((p) => (
            <span
              key={p.name}
              role="img"
              aria-label={p.name}
              className="bg-muted-foreground hover:bg-foreground mx-8 inline-block h-6 w-16 shrink-0 transition-colors lg:mx-10"
              style={{
                maskImage: `url(/logos/pay/${p.file}.svg)`,
                WebkitMaskImage: `url(/logos/pay/${p.file}.svg)`,
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
              }}
            />
          ))}
        </Marquee>
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r to-transparent" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l to-transparent" />
      </div>
      <p className="text-muted-foreground mt-8 text-center text-xs">
        {messages.trustBand.security}
      </p>
    </div>
  );
}

export default PaymentMarquee;
```

- [ ] **Step 4: Typecheck**

Run: `pnpm nx typecheck @tourism/web && pnpm nx typecheck @tourism/i18n`
Expected: PASS — `techCloud`/`about.builtWith` are still present (kept until Task 5), so their consumers still compile; the new `trustBand` block + `PaymentMarquee` add cleanly.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/i18n/src/lib/messages.ts apps/web/public/logos/pay apps/web/src/components/marketing/payment-marquee.tsx
git commit -m "feat(web): trust-band i18n + self-hosted monochrome payment marquee"
```

---

### Task 4: StatCluster + TrustBand components

**Files:**
- Create: `apps/web/src/components/marketing/stat-cluster.tsx`
- Create: `apps/web/src/components/marketing/trust-band.tsx`
- Test: `apps/web/src/components/marketing/trust-band.spec.tsx`

**Interfaces:**
- Consumes: `TrustStat` from `../../lib/trust-band`; `PaymentMarquee` from `./payment-marquee`; `messages.trustBand`.
- Produces: `StatCluster({ stats }: { stats: TrustStat[] })`
- Produces: `TrustBand({ stats }: { stats: TrustStat[] })` — the full dark section.

- [ ] **Step 1: Write the failing render test**

Create `apps/web/src/components/marketing/trust-band.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { TrustBand } from './trust-band';

describe('TrustBand', () => {
  it('renders the eyebrow, each stat value + label, and the security caption', () => {
    render(
      <TrustBand
        stats={[
          { value: '23', label: 'Curated tours' },
          { value: '4.4★', label: 'Average rating' },
        ]}
      />,
    );
    expect(screen.getByText('Why travelers choose Nexora')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Curated tours')).toBeInTheDocument();
    expect(screen.getByText('4.4★')).toBeInTheDocument();
    expect(
      screen.getByText(/Every booking secured by Stripe & PayPal/),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Visa' })).toBeInTheDocument();
  });

  it('renders nothing when there are no stats (cold API)', () => {
    const { container } = render(<TrustBand stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test @tourism/web --testPathPatterns trust-band.spec.tsx`
Expected: FAIL — `TrustBand` not found.

- [ ] **Step 3: Implement StatCluster**

Create `apps/web/src/components/marketing/stat-cluster.tsx` (floating stats, no dividers, wide gaps):

```tsx
import type { TrustStat } from '../../lib/trust-band';

/** Free-floating stat units (no dividers) — big serif numbers + muted labels. */
export function StatCluster({ stats }: { stats: TrustStat[] }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-14 gap-y-8">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <div className="font-heading text-foreground text-4xl font-semibold tabular-nums">
            {s.value}
          </div>
          <div className="text-muted-foreground mt-2 text-sm tracking-wide">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatCluster;
```

- [ ] **Step 4: Implement TrustBand**

Create `apps/web/src/components/marketing/trust-band.tsx`. `dark` forces the dark palette regardless of site theme (no hex); emerald accent via `text-primary`:

```tsx
import { messages } from '@tourism/i18n';
import type { TrustStat } from '../../lib/trust-band';
import { PaymentMarquee } from './payment-marquee';
import { StatCluster } from './stat-cluster';

/** Dark trust band: eyebrow · live stats · hairline · monochrome payment marquee · security caption. */
export function TrustBand({ stats }: { stats: TrustStat[] }) {
  if (stats.length === 0) return null;
  const t = messages.trustBand;
  return (
    <section className="dark bg-background text-foreground py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-primary mb-9 text-center text-xs font-semibold tracking-[0.22em] uppercase">
          {t.eyebrow}
        </p>
        <StatCluster stats={stats} />
        <div className="border-border/70 mt-12 border-t pt-10">
          <PaymentMarquee />
        </div>
      </div>
    </section>
  );
}

export default TrustBand;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm nx test @tourism/web --testPathPatterns trust-band.spec.tsx`
Expected: PASS. (If the mask-`style` payment spans don't expose an accessible name in jsdom, the `getByRole('img', { name: 'Visa' })` relies on `role="img" aria-label` — which jsdom honours.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/marketing/stat-cluster.tsx apps/web/src/components/marketing/trust-band.tsx apps/web/src/components/marketing/trust-band.spec.tsx
git commit -m "feat(web): TrustBand + StatCluster components (dark band, TDD)"
```

---

### Task 5: Wire home + About; retire the tech-stack components

**Files:**
- Modify: `apps/web/src/app/page.tsx` (home)
- Modify: `apps/web/src/app/about/page.tsx`
- Delete: `apps/web/src/components/marketing/tech-cloud.tsx`
- Delete: `apps/web/src/components/marketing/tech-marquee.tsx`
- Delete: `apps/web/src/components/about/built-with.tsx`
- Modify: `libs/shared/i18n/src/lib/messages.ts` (remove now-unused `about.builtWith`)

**Interfaces:**
- Consumes: `fetchTrustStats` (Task 2), `buildTrustStats` (Task 2), `TrustBand` (Task 4), `messages.trustBand` (Task 3).

- [ ] **Step 1: Wire the home page**

In `apps/web/src/app/page.tsx`: swap the `TechCloud` import for `TrustBand`, add the stats fetch/build, and render it where `TechCloud` was.

Replace the import line `import { TechCloud } from '../components/marketing/tech-cloud';` with:
```tsx
import { TrustBand } from '../components/marketing/trust-band';
import { fetchTrustStats } from '../lib/api/trust-stats';
import { buildTrustStats } from '../lib/trust-band';
```
Add `trustStats` to the `Promise.all` (extend the destructuring + array):
```tsx
  const [featured, tiles, counts, posts, trustStats] = await Promise.all([
    fetchTourCards({ featured: true }).catch(() => []),
    fetchDestinationTiles().catch(() => []),
    fetchTourDestinationCounts().catch(() => ({})),
    fetchPosts({ pageSize: 3 }).then((page) => page.posts).catch(() => []),
    fetchTrustStats().catch(() => ({ tours: 0, destinations: 0, reviewCount: 0, averageRating: null })),
  ]);
```
Replace the `<TechCloud />` line (and its comment) with:
```tsx
      {/* Real-stat trust band + accepted payment methods — breather after the hero */}
      <TrustBand stats={buildTrustStats(trustStats, messages.trustBand.stats)} />
```

- [ ] **Step 2: Wire the About page**

Open `apps/web/src/app/about/page.tsx`. Replace the `BuiltWith` import with the trust-band imports (as in Step 1: `TrustBand`, `fetchTrustStats`, `buildTrustStats`, and ensure `messages` is imported from `@tourism/i18n`). If the About page is an RSC (no `'use client'`), fetch stats at the top:
```tsx
  const trustStats = await fetchTrustStats().catch(() => ({
    tours: 0, destinations: 0, reviewCount: 0, averageRating: null,
  }));
```
Replace `<BuiltWith />` with:
```tsx
      <TrustBand stats={buildTrustStats(trustStats, messages.trustBand.stats)} />
```
(If About is not already `async`, make the default export `async function`.)

- [ ] **Step 3: Delete the retired components**

```bash
git rm apps/web/src/components/marketing/tech-cloud.tsx apps/web/src/components/marketing/tech-marquee.tsx apps/web/src/components/about/built-with.tsx
```

- [ ] **Step 4: Remove the dead i18n blocks**

In `libs/shared/i18n/src/lib/messages.ts`, delete the two now-unused blocks: the top-level `techCloud: { eyebrow: 'Built with' }` object and the `about.builtWith: { caption: '…' }` object. Do not touch adjacent keys.

- [ ] **Step 5: Verify nothing else references the deleted symbols**

Run: `pnpm nx typecheck @tourism/web`
Expected: PASS with no `TechCloud`/`TechMarquee`/`BuiltWith`/`techCloud`/`builtWith` references remaining. If typecheck flags a leftover import, remove it.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/about/page.tsx libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(web): render TrustBand on home + About, retire tech-stack marquee"
```

---

### Task 6: Gate + docs sweep

**Files:**
- Modify (docs): `CLAUDE.md` (web row), `docs/roadmap.md` if it has a matching row, `HANDOFF.md`, and this plan's status. Update test-count baselines where they appear.

- [ ] **Step 1: Run the full gate (hand to the user)**

Ask the user to run:
```bash
pnpm nx run-many -t lint typecheck test build --projects=@tourism/web,@tourism/api,@tourism/i18n
```
Expected: all green. Fix any failure at its root before proceeding.

- [ ] **Step 2: Manual visual check (hand to the user)**

Confirm on the running web app: home + About show the dark trust band with real numbers (`23 curated tours · 16 destinations · 4.4★`), the monochrome payment marquee scrolls (and pauses on hover / is static under reduced-motion), the security caption reads correctly, and no horizontal overflow.

- [ ] **Step 3: Docs sweep**

Per CLAUDE.md rule 9: update the `@tourism/web` status line in `CLAUDE.md` (note the trust band replacing the tech marquee), the roadmap row if present, `HANDOFF.md` current-state/next-action, and bump any stated web test-count baseline (new specs: `trust-band.spec.ts`, `trust-band.spec.tsx`, plus the api `reviews.service.spec.ts` cases). Mark this plan's status **DONE**.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md HANDOFF.md docs/roadmap.md docs/07-plans/2026-07-10-home-trust-band.md
git commit -m "docs: sweep for home trust-band merge"
```

---

## Notes for the executor

- **Branch:** already on `feat/home-trust-band` (the spec lives there). Do not commit to `main`.
- **Payment logos are decorative brand marks;** the accessible name comes from `aria-label`. Do not add visible logo captions beyond the security line.
- **Do not** widen payment methods beyond Visa/Mastercard/Amex/PayPal/Stripe (honesty constraint — Stripe is `card`-only + PayPal).
- **Dark band uses the `dark` class** to pull the dark-theme tokens; if the dark palette reads too neutral and you want more emerald, layer `bg-primary/[a small alpha]` over the section via an absolutely-positioned token-coloured overlay — never a raw hex.
