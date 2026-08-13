# Checkout success page redesign — implementation plan

**Spec:** [`docs/06-specs/2026-08-12-checkout-success-redesign-design.md`](../06-specs/2026-08-12-checkout-success-redesign-design.md)
**Branch:** `feat/checkout-success-redesign` · **Date:** 2026-08-12

## STATUS

- [x] T1 `trip-essentials.ts` — `toTripEssentials` mapper + `fetchTripEssentials` (TDD)
- [x] T2 i18n additions (`messages.booking.success` — hero/highlights/inclusions/before-you-go)
- [x] T3 `CheckoutHero` component (full-bleed status hero)
- [x] T4 `CheckoutResult` refactor (drop H1/status block, keep summary + footer)
- [x] T5 `TripHighlights` + `TripInclusions` components
- [x] T6 `BeforeYouGo` component
- [x] T7 `success/page.tsx` — compose the new stack, fetch `trip` alongside `booking`
- [x] T9 "View trip details" link from `/account/bookings/[code]` (added mid-flight: the
      success page had no reachable entry point after the payment redirect)
- [x] T10 booking progress timeline (spec decision #8) — `buildBookingTimeline` (TDD,
      11 tests) + `BookingTimeline` rail on BOTH the success page and booking detail
- [ ] T8 gate + manual PAID/PENDING/tour-lookup-failed check

**RESUME STATE:** implementation complete on `feat/checkout-success-redesign`;
gate GREEN (`lint test build` for web + i18n — web **402** tests, i18n 1).
Component specs from the spec's testing section were dropped: this repo has no
`.spec.tsx` component tests anywhere (TDD covers pure logic only, UI is
verified manually/e2e) — `trip-essentials.spec.ts` (6 tests) is the TDD piece.
**Not yet committed — awaiting user review + manual browser verification.**

## Sequencing

T1 → T2 → (T3, T5, T6 in parallel — independent leaf components) → T4 → T7 → T8.
T4 depends on T3 existing (hero owns the status block T4 is removing from the
card) but not on T5/T6. T7 needs all of T3–T6 done.

## Reused seams

- `getApiClient` + `tourTag` (`lib/api/client.ts`, `lib/revalidate.ts`) — same
  cache-tag convention as `fetchTourDetail`, no new endpoint.
- `TourDetailDto.media`/`.highlights`/`.included`/`.excluded`/`.meetingPoint` —
  all already in the generated schema (`libs/shared/core/src/lib/api/schema.ts:2074-2093`).
  `meetingPoint` exists on the wire today but nothing on web currently reads it.
- `Card`/`CardContent`/`Separator`/`buttonVariants`/`cn` from `@tourism/ui` —
  same primitives `checkout-result.tsx` already uses.
- `messages.booking.success.*` — extend in place, don't fork a new namespace.
- Barrel-mock component-test convention already used across `apps/web/src/components/booking/*.spec.tsx`.

## Tasks

### T1 — `trip-essentials.ts` (test-first)

`apps/web/src/lib/api/trip-essentials.spec.ts` FIRST:
- `toTripEssentials`: hero media picks `role === 'hero'`, falls back to
  `media[0]`, falls back to `image: undefined` when `media` is `[]`.
  `highlights`/`included`/`excluded` default to `[]` when absent.
  `meetingPoint` passes through (including `null`).

Then `trip-essentials.ts`: the pure mapper + `fetchTripEssentials(slug)`
(mirrors `fetchTourDetail`'s single-resource envelope-unwrap, `tourTag(slug)`
cache tag, `null` on error/missing — no reviews/related calls).

**Accept:** `pnpm nx test @tourism/web` green on the new spec.

### T2 — i18n additions

`messages.booking.success`: add `heroBadge(code)`, `highlightsHeading`,
`inclusionsHeading`, `notIncludedHeading`, `beforeYouGo.{heading,
packingHeading, packingItems, meetingHeading, meetingFallback, supportHeading,
supportBody, supportEmail}`. Pull `supportEmail` from whatever constant the
footer/contact section already uses — do not hardcode a second address.

**Accept:** typecheck (new keys exist before components reference them in T3–T6).

### T3 — `CheckoutHero`

`apps/web/src/components/booking/checkout-hero.tsx` (+ spec): full-bleed
`next/image` (or a themed gradient block when `trip?.image` is undefined —
never a broken `<Image src>`), dark overlay, status icon (reuse the
CheckCircle2/Loader2 + `role="status" aria-live="polite"` block moved out of
`CheckoutResult`), title/body (`confirmedTitle/Body` vs `pendingTitle/Body`,
unchanged copy), small ref-code pill using `heroBadge(booking.code)`.

**Accept:** spec covers image-present vs image-absent (fallback block, not a
broken image) and PAID vs PENDING copy/icon selection.

### T4 — `CheckoutResult` refactor

Remove the H1/status `div` (now in `CheckoutHero`) and the top `Separator`
before it. Keep the summary `Row`s and the PAID/PENDING footer branch
(emailNote+CTA vs `AutoRefresh`) — for now leave the footer inside this
component (page composition in T7 just stops rendering the old header). Update
the existing `checkout-result.spec.tsx` to match (no more title/body
assertions here — those move to `checkout-hero.spec.tsx`).

**Accept:** existing + updated tests green; visually the card now starts at
the ref-code row.

### T5 — `TripHighlights` + `TripInclusions`

Two new Server Components, each `null` when its input is empty (mirrors the
home `Trust` "hide rows with no honest data" convention — see
`apps/web/src/lib/trust-section.ts` for the pattern, not the code):

- `trip-highlights.tsx`: bullet list of `trip.highlights`, heading from
  `highlightsHeading`.
- `trip-inclusions.tsx`: two-column check/× list from `trip.included`/
  `trip.excluded` (lighter than `TourIncluded` — no meals/transport/
  accommodation spec rows), headings from `inclusionsHeading`/
  `notIncludedHeading`.

**Accept:** spec per component — empty array/undefined → renders nothing;
populated → renders every item.

### T6 — `BeforeYouGo`

`apps/web/src/components/booking/before-you-go.tsx` (+ spec): static packing
list (`beforeYouGo.packingItems`) always renders; meeting-point line uses
`trip?.meetingPoint` when present, else `meetingFallback`; support block
(`supportHeading`/`supportBody`/`supportEmail`) always renders. This section
never disappears (unlike T5's two) — it's the one guaranteed-present block
when `trip` itself is `null`.

**Accept:** spec covers real-meetingPoint vs null-meetingPoint (fallback
copy) vs `trip === null` (still renders packing + support).

### T7 — `success/page.tsx` composition

Fetch `trip = await fetchTripEssentials(booking.tour.slug)` in parallel with
(or right after) `fetchBooking` — booking is needed first for the slug, so:
`booking` → then `Promise.all([captureBooking-if-needed, fetchTripEssentials])`
where the capture branch only runs for PayPal+PENDING (existing logic
untouched). Compose: `CheckoutHero` → `CheckoutResult` → `TripHighlights` →
`TripInclusions` → `BeforeYouGo`. Widen the page's `max-w-xl` container for
the hero/content sections (summary card can stay narrower inside a wider
page — match spacing to the home page's section rhythm, not a hard pixel
value).

**Accept:** page renders end-to-end locally against a real booking (manual —
see T8); typecheck + build green.

### T8 — gate + manual verification

`pnpm nx run-many -t lint typecheck test build -p @tourism/web @tourism/i18n`
(kill orphan node first per the repo gotcha). Manual check against the local
API + a real booking:
1. PAID booking with a published tour that has `meetingPoint` set → hero
   image, highlights, inclusions, real meeting point all render.
2. PENDING (PayPal pre-capture) → same tour content, spinner + `AutoRefresh`
   footer, no layout jump once it flips to PAID.
3. Tour deleted/unpublished after booking (or force `fetchTripEssentials` to
   return `null`) → page still confirms the booking, before-you-go still
   renders with the fallback meeting-point copy, no crash.

**STOP before merge — report gate + manual-check results, wait for review.**

## Post-merge (rule 9)

CHANGELOG entry · `frontend.md` (checkout-success section note) · this plan's
STATUS ticked · `docs/roadmap.md` phase cell if applicable.
