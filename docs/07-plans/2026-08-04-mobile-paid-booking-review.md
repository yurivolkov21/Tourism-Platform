# Mobile PAID-booking review form — implementation plan

**Spec:** [`docs/06-specs/2026-08-04-mobile-paid-booking-review-design.md`](../06-specs/2026-08-04-mobile-paid-booking-review-design.md)
**Branch:** none — ships as commits directly on `nghia-v2` (locked decision 2 in the spec) · **Date:** 2026-08-04

## STATUS

- [x] T1 pure logic `apps/mobile/src/lib/reviews.ts` (TDD) — 19 tests
- [x] T2 `hasReview` on `BookingVm` — required field (not optional); 6 unrelated
  fixture files needed a mechanical `hasReview: false` addition to keep
  typecheck green (`booking-detail.spec.tsx`, `booking-result.spec.tsx`,
  `home-helpers.spec.ts`, `home.spec.tsx`, `trips.spec.tsx`,
  `upcoming-trip-card.spec.tsx`)
- [x] T3 `RatingInput` primitive (`libs/mobile/ui`) — built with a Unicode
  glyph instead of `Ionicons` (see spec's locked-decision-4 update — mobile-ui
  has no icon-lib dependency anywhere, kept it that way)
- [x] T4 `ReviewPrompt` component — 6 tests
- [x] T5 wired into `bookings/[code]/index.tsx` (after `<Actions>`, PAID gate)
- [x] T6 gate — GREEN: `pnpm nx run-many -t lint typecheck test build -p
  @tourism/mobile mobile-ui @tourism/i18n` — 0 lint errors (3 pre-existing
  unrelated warnings), typecheck clean, **206** mobile tests passing (was
  167 — +39: this feature's own tests + the 6 fixture touch-ups), mobile-ui
  56/56, build (web/android/ios export) succeeded.

**RESUME STATE:** all 6 tasks done. **Not committed** — this session's
convention has been to leave changes uncommitted for the user to review; spec
+ plan were also left uncommitted per the same convention (no explicit commit
request yet). No manual on-device Stripe-checkout-to-review pass done yet
(needs a human running the app) — see plan's "Post-merge" section.

## Sequencing

T1 → T2 (independent of T1, can run in parallel) → T3 (independent, can run
parallel with T1/T2) → T4 (needs T1 + T2 + T3) → T5 (needs T4) → T6.

## Reused seams

- `getApiClient()` (`apps/mobile/src/lib/api.ts`) + `ApiRequestError`
  (`@tourism/core`) — same call/error pattern as `postBooking`/`createBooking`
  in `apps/mobile/src/lib/booking.ts`.
- `messages.reviews` + `messages.fieldErrors.{rating,title,body}`
  (`@tourism/i18n`) — already shared, zero new copy.
- `TextField` (`error` prop), `Button` (`loading` prop), `AppText`, `Spinner`
  from `@tourism/mobile-ui` — no new form primitives besides `RatingInput`.
- `Chip`'s a11y pattern (`accessibilityRole="button"` +
  `accessibilityState={{ selected }}`) as the model for `RatingInput`'s stars.
- `Actions` component's mutation pattern in `bookings/[code]/index.tsx`
  (`useMutation` + `queryClient.invalidateQueries({ queryKey: ['bookings'] })`
  via a local `refresh()`) — `ReviewPrompt`'s submit mutation follows the same
  shape.
- `bookingErrorMessage`-style code→copy lookup (`apps/mobile/src/lib/booking.ts`)
  — `ReviewPrompt` does the same against `messages.reviews.errors`.

## Tasks

### T1 — pure logic (test-first)

`apps/mobile/src/lib/reviews.spec.ts` FIRST:
- `validateReviewFields`: rating 0 → `RATING_REQUIRED`; rating 6 →
  `RATING_REQUIRED`; rating 3.5 → `RATING_REQUIRED`; rating 1/5 → no error;
  title 120 chars → no error; title 121 chars → `TITLE_TOO_LONG`; title
  omitted/empty → no error (optional); body empty/whitespace-only →
  `BODY_REQUIRED`; body 9 chars → `BODY_TOO_SHORT`; body 10 chars → no error;
  body 2000 chars → no error; body 2001 chars → `BODY_TOO_LONG`; all valid →
  `{}`.
- `createReview`: mock `getApiClient().POST` — happy path posts
  `{ bookingCode, rating, title: title.trim() || undefined, body: body.trim() }`
  and returns the unwrapped DTO; empty `{ data: undefined }` response throws.

Then `apps/mobile/src/lib/reviews.ts` (green): port
`validateReviewFields` logic 1:1 from `apps/web/src/lib/forms/validate.ts`'s
review portion (same error-code strings so `messages.fieldErrors` keys match);
`createReview` mirrors `postBooking`'s unwrap-or-throw shape.

**Accept:** `pnpm nx test @tourism/mobile` green for the new spec file.

### T2 — `hasReview` on `BookingVm`

`apps/mobile/src/lib/booking.ts`: add `hasReview: boolean` to the `BookingVm`
interface; `toBookingVm` maps `dto.hasReview ?? false`. Check
`booking.spec.ts` (if it exists) for a `toBookingVm` mapping test to extend;
otherwise add one asserting the new field round-trips.

**Accept:** typecheck green; existing `booking.ts` tests still pass.

### T3 — `RatingInput` primitive

`libs/mobile/ui/src/lib/rating-input.tsx`: props `{ value: number; onChange:
(n: number) => void; error?: boolean }`. Five `Pressable` stars (`Ionicons`
`star`/`star-outline`, filled when `n <= value`), each
`accessibilityRole="button"`, `accessibilityLabel`
`messages.reviews.ratingValueLabel(n)`, `accessibilityState={{ selected: value
=== n }}`, `hitSlop` + `minHeight: 44` (match `Chip`/`Button` touch-target
convention). Export from the mobile-ui barrel. `rating-input.spec.tsx`: 5
stars render; tapping star 3 calls `onChange(3)`; `value=3` → stars 1-3 marked
selected/filled, 4-5 not.

**Accept:** `pnpm nx test mobile-ui` green; barrel export resolves from
`@tourism/mobile-ui`.

### T4 — `ReviewPrompt` component

`apps/mobile/src/components/review-prompt.tsx`: props `{ booking: BookingVm }`.
State: `rating`, `title`, `body`, `status` (seeded `hasReview ? 'alreadyReviewed'
: 'idle'`), `fieldErrors`. `useMutation` wrapping `createReview`; `onSuccess`
→ `status = 'success'` + invalidate `['bookings', booking.code]`; `onError` →
if `ApiRequestError` with `code === 'REVIEW_ALREADY_EXISTS'` → `status =
'alreadyReviewed'`, else set a banner from `messages.reviews.errors[code] ??
messages.reviews.errors.generic`. Submit handler runs `validateReviewFields`
first — on any field error, set `fieldErrors` and return without calling the
mutation. Renders: `idle` → heading + `RatingInput` + title `TextField` + body
`TextField(multiline)`, each wired to its `fieldErrors.*` → `error` prop, then
submit `Button` (`loading` while pending); `success`/`alreadyReviewed` → a
small status block (icon-less is fine on mobile — `AppText` title + body,
mirrors web's `StatusPanel` copy via `messages.reviews.successTitle/Body` and
`alreadyReviewedTitle/Body`).

`review-prompt.spec.tsx`: `hasReview: true` → already-reviewed panel, no form,
no API call possible; `hasReview: false` → form renders; submit with empty
body → `BODY_REQUIRED` shown inline, `createReview` not called (mock and
assert `not.toHaveBeenCalled()`); happy path (mock `createReview` resolved) →
success panel; `createReview` rejecting with `ApiRequestError('REVIEW_ALREADY_EXISTS')`
→ already-reviewed panel; other `ApiRequestError` → banner text matches the
mapped code.

**Accept:** `pnpm nx test @tourism/mobile` green for the new spec file.

### T5 — wire into the booking detail screen

`apps/mobile/src/app/bookings/[code]/index.tsx`: import `ReviewPrompt`; in
`BookingDetailScreen`'s return, after `<Actions booking={booking} />`, render
`{booking.status === 'PAID' ? <ReviewPrompt booking={booking} /> : null}`.
No changes inside `Actions` itself.

**Accept:** existing `booking-detail`-related specs (if any) still pass;
manual check in Expo (per spec's "Manual device pass").

### T6 — gate + review

Kill orphan node processes first (repo gotcha). Then:

```bash
pnpm nx run-many -t lint typecheck test build -p @tourism/mobile mobile-ui @tourism/i18n
```

Self-review the diff against the spec's acceptance criteria (no
`superpowers:requesting-code-review` available this session — do a careful
manual pass instead, plus `/code-review` on the working diff if the user wants
a second pass). Report the mobile test-count delta (baseline **167**, per
CLAUDE.md's current row). **STOP and confirm with the user before any
commit** (this session's convention has been to leave changes uncommitted for
the user to review/commit themselves — confirm whether that holds here too).

## Post-merge (rule 9)

CHANGELOG entry · CLAUDE.md `@tourism/mobile` row (test count bump) ·
`frontend.md` mobile booking-detail note · roadmap P5.7 cell if applicable.
Manual device pass: book → pay (Stripe test mode, local API) → open booking
detail → submit review → confirm `GET /reviews/mine` shows it pending →
(optional) admin-approve → confirm it surfaces on `tours/[slug]/reviews.tsx`.
