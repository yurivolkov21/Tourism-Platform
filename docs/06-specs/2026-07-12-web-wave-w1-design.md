# Web wave W1 — review form · suitableFor chips · contact lead fields — design spec

**Date:** 2026-07-12 · **Scope:** apps/web + @tourism/i18n (NO BE changes — all
three capabilities already ship in the API) · **Status:** approved (user
2026-07-12: web debt program W1→W2→W3; landing pages stay cut; auth stays
inline-only).

## ① "Rate this trip" — review creation on PAID bookings

BE contract (verified): `POST /reviews` takes `{ bookingCode (BK-…), rating
1–5, title? ≤120, body 10–2000 }`; owner-only, **status must be exactly PAID**;
1-per-booking via DB unique → 409 `REVIEW_ALREADY_EXISTS`; other codes:
400 `REVIEW_NOT_ELIGIBLE` · 403 `BOOKING_FORBIDDEN` · 404 `BOOKING_NOT_FOUND` ·
401 `USER_NOT_SYNCED`. Created review is `isApproved: false` and invisible
everywhere customer-facing until moderated. **No DTO exposes hasReview** — the
form is offered optimistically and the 409 is handled as a friendly state.

- **Placement:** a new `ReviewPrompt` block on
  `account/bookings/[code]/page.tsx`, rendered **only when
  `booking.status === 'PAID'`**, after `<BookingActions>`.
- **Form** (`'use client'`, `noValidate` + `aria-required` — standing rule):
  star rating (5 `<button role="radio">` in a `radiogroup`, keyboard-friendly)
  · optional title input · required body textarea. Per-field errors via the
  shared `lib/forms/validate.ts` pattern (new TDD'd
  `validateReviewFields`: rating 1–5 required · body required/min 10/max 2000 ·
  title max 120 — mirrors the BE limits) rendered through `FieldErrorText` with
  `aria-invalid`/`-describedby`; copy in `messages.fieldErrors` + new
  `messages.reviews.*`.
- **Flow:** server action `submitReview` (`lib/reviews/actions.ts`, mirrors
  `lib/booking/actions.ts` shape `{ ok, fieldErrors?, error? }`) → wrapper
  `createReview` in `lib/api/reviews.ts` (`authedJson<ReviewDto>` POST).
  Server-side re-validation before the API call (client validation is UX
  only). Feedback follows the lead-capture convention: **success = inline
  "Thanks — your review is awaiting moderation" panel** (form hides), failures
  toast + inline; `409 REVIEW_ALREADY_EXISTS` renders the same panel variant
  ("You've already reviewed this trip") instead of an error toast.
- Error-code → copy map in `messages.reviews.errors` (the 5 codes above).

## ② suitableFor merchandising chips

`Tour.suitableFor: TravellerType[]` (FAMILY · COUPLE · FRIENDS · SOLO ·
BUSINESS) is on BOTH `TourSummaryDto` + `TourDetailDto` and already in the
generated schema — the web mappers just drop it.

- Map it: `toTourCard` (+`TourCardData.suitableFor`) and `toTourDetail`
  (+`TourDetailVM.suitableFor`) with `?? []` defaults (TDD the mappers'
  new field).
- Render:
  - **Tour detail**: an "Ideal for" chip row in the hero meta area (joins the
    existing meta stack under the badge) — muted pill chips, tokens only,
    hidden when empty.
  - **Tour card**: a compact one-line muted row in `CardContent` (icon +
    joined labels, truncated) — NOT in the image badge overlay (that slot is
    `TourBadge`-specific). Hidden when empty.
- New i18n: `messages.tours.suitableFor` heading + `messages.travellerTypes`
  enum→label map (Family trips · Couples · Friends · Solo travellers ·
  Business). No existing keys cover these (verified).

## ③ Contact form sends the full lead set

`buildContactPayload` currently emits only `interests[0]`; the BE Enquiry DTO
already accepts nationality ≤80 · travelDate (date string) · groupSize 1–100 ·
budgetTier ≤40 (all optional). PlanTripForm already renders all four widgets.

- Lift `ChoiceChips` out of `plan-trip-form.tsx` into a shared
  `components/marketing/choice-chips.tsx` (unchanged behavior; PlanTrip
  imports it).
- Contact form (`contact-inquiry.tsx`) gains 4 **optional** fields using the
  same widgets: nationality `Input` · travelDate `DatePicker` · groupSize
  number `Input` · budgetTier `ChoiceChips` single-select. The existing single
  `interest` Select stays (no regression). Labels via new
  `messages.contact.inquiry.form.*` keys (same wording as planTrip's).
- `buildContactPayload` extended to pass the four fields through the same
  normalizers PlanTrip uses (`parseGroupSize`, trim-to-undefined) — **TDD
  first** in `lib/enquiry-form.spec.ts` (extend the existing describe).
- `buildEnquiryCtaPayload` intentionally stays minimal (compact CTA — recorded
  design decision, not debt).

## Non-goals

- BE changes of any kind · pending-review visibility ("my reviews") ·
  editing/deleting own review · review photos · destination/category landing
  pages (cut) · auth toasts (stays inline-only) · CTA form lead fields.

## Error handling

Review form: field errors inline; API codes → `messages.reviews.errors.*`;
409 → already-reviewed panel; 401 → generic session message + login link.
Contact: unchanged paths — new fields are optional, validation additive
(groupSize bounds only when provided).

## Testing (TDD on logic)

- `lib/forms` new `validateReviewFields` spec (limits, boundary 10/2000/120,
  rating bounds) — red first.
- `lib/enquiry-form.spec.ts` extended: contact payload with/without each lead
  field, groupSize normalization.
- Mapper specs: `suitableFor` mapped + defaulted (tours + tour-detail mappers).
- Existing 35 spec files stay green; `pnpm nx test @tourism/web` (baseline 232).

## Definition of done

A PAID booking's detail page lets its owner submit a 1–5★ review with
validated fields, shows the awaiting-moderation panel, and handles the
already-reviewed 409 gracefully; tour cards + detail show "Ideal for" chips
whenever the tour carries `suitableFor`; the Contact form persists the full
lead set to the CRM; gate green; changelog entry + docs sweep.
