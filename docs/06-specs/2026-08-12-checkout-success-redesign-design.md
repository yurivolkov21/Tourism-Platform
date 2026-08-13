# Checkout success page redesign — design spec

**Date:** 2026-08-12 · **Scope:** `@tourism/web` + `@tourism/i18n` · **Status:** DRAFT

## Goal

`/checkout/success` currently shows a single bare `Card` with ref/tour/date/
travellers/total/contact rows and nothing else. Redesign it into a fuller
"you're booked" page: a full-bleed tour hero, the existing booking summary,
real trip highlights + inclusions pulled from the tour the buyer just booked,
and a static "Before you go" section (what to bring, meeting point, support
contact) — so the page both confirms the payment and preps the traveller for
the trip.

## Locked decisions (confirmed with user 2026-08-12)

1. **Visual direction: full-bleed hero.** Same visual language as the home
   `Trust` band (`components/marketing/trust.tsx`) — large tour image with a
   dark overlay, the confirmation title/status overlaid on it. Summary +
   content sections stack below on a plain background.
2. **Content, in order:** hero → booking summary (existing rows, unchanged
   copy) → trip highlights (bullets) → included/excluded (compact
   check/×-list) → "Before you go" (static + one real field) → primary CTA.
3. **No new backend fields**, with one exception already sitting unused in
   the API: `TourDetailDto.meetingPoint` (`schema.ts:2092`) exists today but
   `toTourDetail()` doesn't map it. We add that one field to `TourDetailVM`-
   adjacent minimal type (see below) and use it for the "meeting point" line
   when present; a generic fallback line covers tours where it's null.
   Packing/what-to-bring stays static copy — too tour-specific to model
   without new authoring infra, out of scope.
4. **Data source: a lean fetch, not `fetchTourDetail()`.** The existing
   `fetchTourDetail(slug)` (`lib/api/tour-detail.ts:122`) also fetches
   reviews + related tours (`Promise.all` at L134) — wasted work for a page
   that renders neither. New `fetchTripEssentials(slug)` hits the same
   `GET /api/v1/tours/{slug}` endpoint and maps only what this page needs.
5. **Same content in PAID and PENDING.** The tour content (hero, highlights,
   inclusions, before-you-go) doesn't depend on payment status, so it renders
   in both states — only the top status banner (icon/title/body) and the
   bottom CTA-vs-`AutoRefresh` split change, exactly as today. Avoids
   layout jumping the moment PayPal/Stripe confirms.
6. **PayPal capture / Stripe webhook flow is untouched** — `page.tsx`'s
   capture-then-refetch logic and `<AutoRefresh>` stay exactly as-is.
7. **Booking not found / signed-out redirect: unchanged.**
8. **Booking progress timeline** (added mid-flight 2026-08-12, user request —
   "kiểu Shopee"): a read-only order-tracking rail, **Booked → Paid →
   Departure → Completed**, rendered on **both** `/checkout/success` and
   `/account/bookings/[code]` (one shared component). Every step is derived
   from data the DTO already carries (`status`, `createdAt`,
   `departure.startDate/endDate`) — no new BE fields, no "Nexora confirmed"
   step (the API has no such state; inventing one would be fiction).
   Cancelled/refunded bookings **stop** at a terminal end-cap instead of
   showing steps that will never happen.
   - Honesty rule inside the rail: `CANCELLED` alone does **not** prove a
     payment happened (a PENDING booking can be self-cancelled), so no `paid`
     step is emitted for it. `REFUNDED`/`PARTIALLY_REFUNDED` **do** prove it
     (you can only refund a capture), so `paid` stays for those.
9. **"View trip details" entry point** (added mid-flight): `/checkout/success`
   was only reachable via the post-payment redirect. `/account/bookings/[code]`
   now links back to it for PAID/PENDING bookings, so the trip prep is
   re-readable later.

## Out of scope

- Editable/dynamic "what to bring" per tour category (needs new BE authoring
  — noted as a follow-up, not built now).
- Itinerary day-by-day stepper (that's the full `TourItinerary` component on
  the tour detail page — too heavy for a receipt page). We show `highlights`
  (marketing bullets), not the day list.
- Cancellation/refund actions on this page (already live on
  `/account/bookings/[code]`).

## Data: `fetchTripEssentials`

New file `apps/web/src/lib/api/trip-essentials.ts`:

```ts
export interface TripEssentials {
  image?: string;
  imageAlt?: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  meetingPoint: string | null;
}

export function toTripEssentials(dto: TourDetailDto): TripEssentials // pure — TDD
export const fetchTripEssentials = cache(async (slug: string): Promise<TripEssentials | null> => …)
```

- `toTripEssentials`: hero = `dto.media.find(m => m.role === 'hero') ?? dto.media[0]`
  (same rule as `toTourDetail`); `highlights`/`included`/`excluded`/
  `meetingPoint` pass through with `?? []` / `?? null` guards.
- `fetchTripEssentials`: same `getApiClient().GET('/api/v1/tours/{slug}')` +
  `tourTag(slug)` cache tag as `fetchTourDetail` (consistent revalidation on
  review/tour changes), but **no** reviews/related calls. Returns `null` on
  error/missing — the success page already tolerates a booking whose tour
  lookup fails (falls back to summary-only, see below).
- `success/page.tsx` calls `fetchTripEssentials(booking.tour.slug)` alongside
  the existing `fetchBooking` (parallel where possible); `null` → the page
  renders the summary + before-you-go section only (no hero image, no
  highlights/inclusions block) rather than erroring — a booking must never
  fail to confirm because the tour lookup hiccups.

## Component changes

- `checkout-result.tsx` stays the summary card (unchanged), but is no longer
  the whole page — it becomes one section among several.
- `success/page.tsx`: restructure to compose, top to bottom:
  1. `<CheckoutHero booking={booking} trip={trip} />` — new component,
     full-bleed image (or a themed gradient fallback when `trip` is null/has
     no image — never a broken `<Image>`), overlay, status icon/title/body
     (same copy source as today), booking ref shown as a small pill on the
     image.
  2. `<CheckoutResult booking={booking} />` — existing card, minus the
     H1/status block (now lives in the hero) — refactor: extract the summary
     rows into their own render, keep the PAID/PENDING branch (emailNote+CTA
     vs `AutoRefresh`) at the bottom of the page instead of inside the card.
  3. `<TripHighlights items={trip.highlights} />` — bullet list, `null` when
     `trip` is null or `highlights` is empty (mirrors the home `Trust`
     "hide rows with no honest data" convention).
  4. `<TripInclusions included={trip.included} excluded={trip.excluded} />` —
     compact two-column check/× list (lighter than `TourIncluded`: no
     meals/transport/accommodation spec rows, those are derived placeholders
     not real per-tour data). Hidden when both arrays are empty.
  5. `<BeforeYouGo meetingPoint={trip?.meetingPoint} />` — static "what to
     bring" + "support" copy from i18n, plus a real meeting-point line when
     `trip.meetingPoint` is set, else the generic fallback line.
  6. Bottom CTA / `AutoRefresh` (moved out of the card, see #2).

All new components are Server Components (no interactivity needed — unlike
`TourItinerary`'s stepper, this page is read-only).

## i18n additions — `messages.booking.success`

```
success: {
  ...(existing keys unchanged)
  heroBadge: (code: string) => `Booking ${code}`,   // small pill on the hero image
  highlightsHeading: 'Trip highlights',
  inclusionsHeading: 'What's included',
  notIncludedHeading: 'Not included',
  beforeYouGo: {
    heading: 'Before you go',
    packingHeading: 'What to bring',
    packingItems: [ /* static bullet copy — passport/ID, comfortable shoes,
                        weather-appropriate layers, camera, reusable water
                        bottle */ ],
    meetingHeading: 'Meeting point',
    meetingFallback: 'Exact meeting details are in your confirmation email — reply to that thread if anything's unclear.',
    supportHeading: 'Need help?',
    supportBody: 'Our team is on hand before and during your trip.',
    supportEmail: 'support@nexora... ' // reuse messages.brand contact / footer contact — do NOT invent a new address, pull from the existing footer/contact i18n constant
  },
}
```

EN-only (ADR-0005) — no VI parity needed, matches the rest of the repo.

## Testing

- `trip-essentials.spec.ts` (TDD, test-first): `toTripEssentials` — hero
  picks `role: 'hero'` media, falls back to `media[0]`, falls back to
  `undefined` image when `media` is empty; `highlights`/`included`/
  `excluded` default to `[]`; `meetingPoint` passes through `null`.
- `checkout-result.spec.tsx` update: assert the extracted summary-only render
  still shows all rows (no regression from the split).
- New `checkout-hero.spec.tsx` / `trip-highlights.spec.tsx` /
  `trip-inclusions.spec.tsx`: empty-data hides each section; populated data
  renders items.
- Manual check on both PAID and PENDING (PayPal pre-capture) states, and the
  `trip === null` (tour lookup failed) fallback path.

## Acceptance criteria

1. Hero renders the tour's real image (or a graceful themed fallback, never
   a broken image) with the confirmation status overlaid.
2. Highlights/inclusions sections show real per-tour data and hide cleanly
   when empty — no placeholder/fake content.
3. Before-you-go shows a real meeting point when the API has one, otherwise
   the honest fallback copy — never fabricates a location.
4. PENDING behavior (capture, `AutoRefresh`, polling) is byte-for-byte
   unchanged.
5. `/gate` green; new pure logic covered by tests.

## Planned files

| File | Change |
| --- | --- |
| `apps/web/src/lib/api/trip-essentials.ts` (+ `.spec.ts`) | new — `toTripEssentials` + `fetchTripEssentials` |
| `apps/web/src/lib/booking/timeline.ts` (+ `.spec.ts`) | new — `buildBookingTimeline` (decision #8, TDD) |
| `apps/web/src/components/booking/booking-timeline.tsx` | new — the shared progress rail |
| `apps/web/src/app/account/bookings/[code]/page.tsx` | render the rail + "View trip details" link (decisions #8/#9) |
| `apps/web/src/lib/tours.ts` | none (kept separate — `TripEssentials` is its own lean type, not bolted onto `TourDetailVM`) |
| `apps/web/src/app/checkout/success/page.tsx` | compose the new section stack, fetch `trip` alongside `booking` |
| `apps/web/src/components/booking/checkout-hero.tsx` (+ spec) | new — full-bleed status hero |
| `apps/web/src/components/booking/checkout-result.tsx` (+ spec update) | drop the H1/status block (moved to hero); keep summary rows + PAID/PENDING footer |
| `apps/web/src/components/booking/trip-highlights.tsx` (+ spec) | new |
| `apps/web/src/components/booking/trip-inclusions.tsx` (+ spec) | new |
| `apps/web/src/components/booking/before-you-go.tsx` (+ spec) | new |
| `libs/shared/i18n/src/lib/messages.ts` | `booking.success` additions above |
| `docs/CHANGELOG.md` + `frontend.md` | docs sweep on merge (rule 9) |

## Risks

- **Tour lookup fails / tour later unpublished**: booking confirmation must
  never break because of it — `fetchTripEssentials` returns `null` on any
  error, page degrades to summary + before-you-go (generic meeting-point
  fallback) only. Covered by locked decision #4/acceptance #1.
- **Extra request on an already-latency-sensitive payment-return page**: the
  lean fetch (no reviews/related) keeps this to one API round-trip beyond
  `fetchBooking`, run in parallel, not sequential.
