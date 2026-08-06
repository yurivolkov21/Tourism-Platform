# Mobile: PAID-booking review form — design spec

**Date:** 2026-08-04 · **Scope:** `@tourism/mobile` + `@tourism/mobile-ui` · **Status:** APPROVED (scope confirmed 2026-08-04)

## Goal

Mirror web's shipped "Rate this trip" feature on mobile: a customer with a
**PAID** booking can submit a star rating + optional title + review body from
the booking detail screen. Mobile currently only *reads* reviews
(`apps/mobile/src/app/tours/[slug]/reviews.tsx`) — there is no submit path.

## Investigated (web reference — already shipped, do not modify)

- `apps/web/src/components/booking/review-prompt.tsx` — client component,
  local `useState` (not react-hook-form), star `radiogroup` built from
  `<button role="radio">`, submits via a Next.js server action.
- Validation: `validateReviewFields` in `apps/web/src/lib/forms/validate.ts`
  (web-app-local, not shared) — rating int 1-5, title optional ≤120, body
  required 10-2000. Mirrors `CreateReviewDto`
  (`apps/api/src/modules/reviews/dto/create-review.dto.ts`) exactly.
- `POST /api/v1/reviews` (`apps/api/src/modules/reviews/reviews.controller.ts`):
  201 created (`isApproved: false`, pending moderation) · 400
  `REVIEW_NOT_ELIGIBLE` (not PAID) · 401 `USER_NOT_SYNCED` · 403
  `BOOKING_FORBIDDEN` · 404 booking not found · 409 `REVIEW_ALREADY_EXISTS`
  (`Review.bookingId` is `UNIQUE`).
- `BookingDto` already carries `hasReview?: boolean` (computed server-side) —
  web's page only renders the form when `booking.status === 'PAID'`, and seeds
  an "already reviewed" panel from `hasReview` so the form never flashes for
  an already-reviewed booking. The 409 stays as a race backstop.
- Copy is **already shared and generic** — no new i18n needed:
  - `messages.reviews.*` (heading, field labels/placeholders, submit/success/
    already-reviewed panel text, `errors` map keyed by the API's error codes).
  - `messages.fieldErrors.rating|title|body` (the exact per-field codes the
    validator produces: `RATING_REQUIRED`, `TITLE_TOO_LONG`, `BODY_REQUIRED`,
    `BODY_TOO_SHORT`, `BODY_TOO_LONG`).

## Locked decisions

1. **Validation logic is duplicated, not shared.** A new pure function in
   `apps/mobile/src/lib/reviews.ts` reimplements the same rules as web's
   `validateReviewFields` (same limits, same error codes). Explicitly chosen
   over hoisting into `@tourism/core` to keep this feature's blast radius to
   mobile-only — web's shipped form is untouched. (Confirmed with the user
   2026-08-04.)
2. **No branch** — this ships as commits directly on `nghia-v2`, matching how
   the rest of this session's work has landed (confirmed with the user
   2026-08-04; deviates from CLAUDE.md's "one feature = one branch" standing
   rule by explicit choice, not oversight).
3. **Placement mirrors web exactly**: a standalone component
   (`apps/mobile/src/components/review-prompt.tsx`), rendered from
   `BookingDetailScreen` (`apps/mobile/src/app/bookings/[code]/index.tsx`)
   **alongside**, not nested inside, the existing `Actions` component — same
   `booking.status === 'PAID'` gate web uses, independent of the
   cancellation-request panel (a booking can be both reviewable and
   cancellation-requested at once).
4. **New `RatingInput` primitive** in `libs/mobile/ui/src/lib/rating-input.tsx`
   — 5 `Pressable` stars. **Built (deviation from the original Ionicons plan):**
   `libs/mobile/ui` has zero icon-library dependency anywhere (every existing
   component takes icons via a `ReactNode` prop from the consumer instead) —
   adding `@expo/vector-icons` there would be a new precedent, so the stars
   render as a Unicode glyph (`★`/`☆`) via `AppText` instead, keeping the lib
   dependency-free. A11y follows the existing `Chip` pattern in this codebase
   (`accessibilityRole="button"` + `accessibilityState={{ selected }}` per
   star, `accessibilityLabel` `"N stars"`, hardcoded the same shape as
   `messages.reviews.ratingValueLabel` produces rather than importing
   `@tourism/i18n` into `mobile-ui`, which — like icons — no component there
   depends on today).
5. **No server layer** (mobile has none) — the screen calls the API directly
   via `getApiClient()`, same pattern as every other mobile mutation
   (`createBooking`, `requestCancellation`, etc. in `apps/mobile/src/lib/booking.ts`).
   Client-side validation runs before the request; the API's own validation is
   the source of truth (a network round-trip on invalid input is acceptable —
   same trust level as the rest of the mobile app, no separate "server action"
   layer to re-validate in).
6. **Reuse `TextField`** (`libs/mobile/ui`) for title/body — it already has an
   `error` prop (border + message), no new form-field primitive needed.
7. **Unchanged:** `messages.reviews` / `messages.fieldErrors` copy (reused
   verbatim, EN-only per ADR-0005 — the generic "EN/VI" step in the
   `/new-feature` template does not apply, this repo has no VI copy path);
   `BookingDto`/API contract; web's `ReviewPrompt`.

## Architecture

```
BookingDetailScreen (apps/mobile/src/app/bookings/[code]/index.tsx)
 ├─ Badge / booking fact rows (unchanged)
 ├─ <Actions booking={booking} />           (unchanged — Pay/Cancel/cancellation-request)
 └─ <ReviewPrompt booking={booking} />      (NEW — rendered only when booking.status === 'PAID')
      idle → <RatingInput> + title TextField + body TextField(multiline) + submit Button
      submitting → Button loading
      success / alreadyReviewed → status panel (mirrors web's StatusPanel: check icon + title + body)
```

- `ReviewPrompt` owns local state: `rating`, `title`, `body`, `status: 'idle' |
  'submitting' | 'success' | 'alreadyReviewed'`, `fieldErrors`. Seeded from
  `booking.hasReview` exactly like web (`status = hasReview ? 'alreadyReviewed'
  : 'idle'`).
- On submit: run `validateReviewFields` locally → if errors, set
  `fieldErrors` and stop. Else call `createReview()` → on success set
  `'success'`; on `ApiRequestError` with `code === 'REVIEW_ALREADY_EXISTS'` set
  `'alreadyReviewed'`; other `ApiRequestError` → inline banner via
  `messages.reviews.errors[code]` (same `bookingErrorMessage`-style lookup
  already used for booking mutations); non-API error → generic banner.

## Pure logic (TDD) — `apps/mobile/src/lib/reviews.ts`

| Function | Contract |
| --- | --- |
| `validateReviewFields({ rating, title, body })` | Returns `ReviewFieldErrors` (`{ rating?, title?, body? }` of error-code strings). Total function (never throws) — mirrors `apps/web/src/lib/forms/validate.ts`'s `validateReviewFields` rule-for-rule: rating must be an integer 1-5 else `RATING_REQUIRED`; trimmed title >120 chars → `TITLE_TOO_LONG`; trimmed body empty → `BODY_REQUIRED`, <10 → `BODY_TOO_SHORT`, >2000 → `BODY_TOO_LONG`. |
| `createReview(input)` | `POST /api/v1/reviews` via `getApiClient()`, body `{ bookingCode, rating, title: title.trim() || undefined, body: body.trim() }`; unwraps `{ data }`, throws on empty response (same shape as `postBooking`). |

`BookingVm`/`toBookingVm` (`apps/mobile/src/lib/booking.ts`) gain a
`hasReview: boolean` field (`dto.hasReview ?? false`) — the only change to
that existing file.

## Testing

- `reviews.spec.ts` (test-first): `validateReviewFields` — every rule +
  boundary (rating 0/6/non-integer, title exactly 120 vs 121, body 9/10/2000/
  2001 chars, whitespace-only body trims to empty → `BODY_REQUIRED`).
  `createReview` — happy path body shape, empty-response throw (mock
  `getApiClient`).
- `rating-input.spec.tsx` (`libs/mobile/ui`): renders 5 stars; tapping star N
  calls `onChange(N)`; filled stars ≤ current rating.
- `review-prompt.spec.tsx`: renders nothing meaningful when
  `booking.status !== 'PAID'` (screen-level gate, tested via
  `booking-detail-screen.spec.tsx` if one exists, else here); shows form when
  `hasReview: false`; shows already-reviewed panel when `hasReview: true`;
  submit with empty body shows `BODY_REQUIRED` inline, no API call; happy path
  → success panel (mock `createReview`); `REVIEW_ALREADY_EXISTS` → already-
  reviewed panel.
- Manual device pass (local API + Stripe test mode, per this session's setup):
  book a tour → pay → open booking detail → submit a review → confirm it
  shows pending in `GET /reviews/mine` (admin can then approve and it should
  surface on `tours/[slug]/reviews.tsx`).

## Acceptance criteria

1. A PAID booking with `hasReview: false` shows the review form; a PENDING/
   CANCELLED/REFUNDED booking never shows it (same as web).
2. Field validation matches the API's `CreateReviewDto` limits exactly —
   client and server never disagree.
3. Successful submit shows the "awaiting moderation" panel; the booking is
   marked reviewed on next fetch (`hasReview: true`).
4. A race (two submits) surfaces the calm "already reviewed" panel, not an
   error toast.
5. `/gate` green; new pure logic unit-tested; no changes to web or the shared
   API contract.

## Planned files

| File | Change |
| --- | --- |
| `apps/mobile/src/lib/reviews.ts` (+ `.spec.ts`) | new — `validateReviewFields` (TDD) + `createReview` |
| `apps/mobile/src/lib/booking.ts` | add `hasReview` to `BookingVm`/`toBookingVm` |
| `libs/mobile/ui/src/lib/rating-input.tsx` (+ `.spec.tsx`) | new — reusable star picker primitive |
| `libs/mobile/ui/src/index.ts` (or equivalent barrel) | export `RatingInput` |
| `apps/mobile/src/components/review-prompt.tsx` (+ `.spec.tsx`) | new — form + status panels |
| `apps/mobile/src/app/bookings/[code]/index.tsx` | render `<ReviewPrompt booking={booking} />` when PAID |
| `docs/CHANGELOG.md` + touched reference docs | docs sweep on merge (rule 9) |

## Risks

- **`hasReview` staleness after submit**: React Query cache for
  `['bookings', code]` needs invalidating on success so a re-visit doesn't
  show the form again before the next real fetch — `onSuccess` in the submit
  mutation calls `queryClient.invalidateQueries({ queryKey: ['bookings'] })`
  (same pattern `Actions`' mutations already use via `refresh()`).
- **Star tap targets on small screens**: use the same `minHeight: 44`/hitSlop
  convention already established on `Button`/`Chip` for touch-target size.
- **No RN-native radiogroup a11y** — accepted per locked decision 4; consistent
  with `Chip`'s existing a11y pattern elsewhere in this app rather than a
  one-off richer pattern.
