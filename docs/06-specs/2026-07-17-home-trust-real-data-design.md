# Home trust section + testimonials: real data only — design spec

**Date:** 2026-07-17 · **Scope:** `@tourism/web` + `@tourism/i18n` · **Status:** APPROVED (design signed off 2026-07-17)

## Goal

No fabricated numbers or reviews anywhere on the marketing surface. The
"Trusted by travellers worldwide" stat band shows only values computed from
real data (or an honest static pledge); the testimonials carousel shows only
real approved+featured reviews and hides itself when there are none.

## Problem (investigated — confirmed, with corrections to the brief)

1. `messages.ts` `trust.stats` hardcodes `"4.9/5" · "12,000+" · "60+" · "24/7"`;
   `apps/web/src/components/marketing/trust.tsx` renders them verbatim (only
   the background image is dynamic via the `home-trust` Appearance slot).
   Claiming "12,000+ happy travellers" with no such data is a credibility risk.
2. `messages.ts` `testimonials.items` hardcodes four invented reviewers
   (Emily Carter, Lukas Meyer, …). **Correction:** the `Testimonials` component
   renders on **`/destinations`** (not Home) and that page ALREADY feeds it
   real featured reviews (`fetchFeaturedReviews`) — but the component falls
   back to the fake fixture whenever the real list is empty
   (`testimonials.tsx` L42–43). The fallback is the remaining dishonesty.
3. Already-real infrastructure to reuse (do NOT duplicate):
   `fetchTrustStats()` (`lib/api/trust-stats.ts`) aggregates published-tour
   count (`meta.total`), destination count, and the public
   `GET /reviews/summary` (count + average rating) — and the home page already
   calls it for the `TrustBand`. `GET /reviews/featured` is public and in the
   generated client schema.

## Locked decisions

1. **`Trust` becomes prop-fed**: the home page passes its already-fetched
   `trustStats` into `<Trust stats={…} />` — zero additional requests. The
   component stays an async Server Component (it still fetches its background
   via site-media).
2. **Stat rows (honest set):**
   - **Average tour rating** — `"{avg.toFixed(1)}/5"` from the real approved
     aggregate; **hidden** when `averageRating` is `null` (no reviews yet).
   - **Curated itineraries** — the real published-tour count; **hidden** when 0.
   - **24/7 On-trip support** — kept as a static pledge (copy, not a metric).
   - **"Happy travellers" — REMOVED** (no honest source). Follow-ups noted:
     (a) a public PAID-booking count endpoint, or (b) an admin-entered value —
     neither built now (a exposes embarrassingly small real volume; b needs new
     config infra).
3. **Layout stays balanced with a variable row count**: a static
   count→grid-class map (Tailwind can't take dynamic class names); rows render
   centred for 1–4 entries.
4. **Testimonials fallback removed**: empty `items` ⇒ `return null` (section
   hidden, consistent with the other data-fed sections). `/destinations`'s
   real-data flow is untouched.
5. **Fake data deleted from `messages.ts`**: `trust.stats` (replaced by
   `trust.labels` + the static support stat) and the whole
   `testimonials.items` fixture (eyebrow/heading/subtitle stay).
6. Cache posture unchanged: home ISR 300s (`revalidate = 300`; the summary
   fetch already carries `next: { revalidate: 300 }`). Revalidating home when
   reviews/`isFeatured` change stays the follow-up recorded in the
   review-revalidation spec.

## Pure logic (TDD) — `apps/web/src/lib/trust-section.ts`

| Function | Contract |
| --- | --- |
| `buildTrustSectionStats(stats, labels)` | → `TrustStat[]` (value+label rows): rating row `"{x.toFixed(1)}/5"` iff `averageRating !== null`; itineraries row `String(tours)` iff `tours > 0`; support row always (`labels.supportValue`/`supportLabel`). Order: rating · itineraries · support. |
| `trustGridClass(count)` | Static map 1→4 → the grid-cols classes (`lg:grid-cols-N`, base `grid-cols-1/2`); clamps out-of-range counts to the nearest bound. |

Reuses the existing `TrustStats`/`TrustStat` types from `lib/trust-band.ts`.

## i18n reshape — `messages.trust`

```
trust: {
  heading, subtitle              (unchanged)
  labels: {
    rating: 'Average tour rating',
    itineraries: 'Curated itineraries',
    supportValue: '24/7',
    supportLabel: 'On-trip support',
  },
}
```
`trust.stats` (with the fake values) is deleted. `testimonials.items` is
deleted; `TestimonialItem` stays defined in the component.

## Component changes

- `trust.tsx`: props `{ stats: TrustStats }`; builds rows via
  `buildTrustSectionStats`; renders `<dl>` with `trustGridClass(rows.length)`;
  everything else (image slot, overlay, `MetricValue`) unchanged.
- `page.tsx` (home): `<Trust stats={trustStats} />` — `trustStats` is already
  in scope from the existing `Promise.all`.
- `testimonials.tsx`: drop the fixture fallback; `if (!items || items.length
  === 0) return null;` and render `items` directly. The stale doc comment on
  `/destinations` ("falls back to the i18n fixture") is refreshed.

## Testing

- `trust-section.spec.ts` (test-first): full set (rating+tours) → 3 rows in
  order with formatted values; `averageRating: null` → no rating row; `tours: 0`
  → no itineraries row; both missing → support row only; `trustGridClass` map +
  clamping.
- `testimonials.spec.tsx` (barrel mock): `items` → renders quotes; empty/
  undefined → renders nothing; asserts the fake fixture names (e.g. "Emily
  Carter") appear nowhere.
- Visual check on the Vercel preview (empty-DB vs seeded states per the brief's
  verify section).

## Acceptance criteria

1. No fabricated numbers: rating + itinerary count are live API values;
   "12,000+" and "Happy travellers" are gone; support stays as an honest pledge.
2. Rows with no honest data are hidden and the grid stays balanced (1–3 rows).
3. Testimonials shows only real approved+featured reviews; zero featured →
   section hidden; no fake names/content remain in `messages.ts`.
4. `/gate` green; row-selection/formatting + fallback-removal covered by tests.

## Planned files

| File | Change |
| --- | --- |
| `apps/web/src/lib/trust-section.ts` (+ `.spec.ts`) | new — row builder + grid map (TDD) |
| `apps/web/src/components/marketing/trust.tsx` | prop-fed stats, dynamic grid |
| `apps/web/src/app/page.tsx` | pass `trustStats` into `<Trust />` |
| `apps/web/src/components/marketing/testimonials.tsx` (+ `.spec.tsx`) | drop fixture fallback (empty → null) |
| `apps/web/src/app/destinations/page.tsx` | comment refresh only |
| `libs/shared/i18n/src/lib/messages.ts` | `trust.labels`; delete fake stats + testimonial fixture |
| `docs/CHANGELOG.md` + `frontend.md` | docs sweep on merge (rule 9) |

## Risks

- **Sparse look while data is small** (e.g. only "12 curated itineraries" +
  support): accepted — honest beats padded; the grid map keeps it centred.
- **Cold API at build/ISR time**: home already falls back to zeros/null →
  rows hide; the section still renders heading + support pledge (never broken).
