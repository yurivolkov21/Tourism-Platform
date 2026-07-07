# P5 Mobile — W4 Booking (final wave) — Design Spec

- **Date:** 2026-07-07
- **Status:** Draft — pending user review
- **Branch:** `feat/mobile-w4-booking`
- **Depends on:** W1 foundation · W2 browse & detail · W2.5 design language ·
  W3 auth & account (all merged). Locked UI direction: **"Brand 100% +
  Structure native"**. Guest-first auth.
- **Related:** web booking flow (`apps/web/src/lib/booking/*`,
  `apps/web/src/lib/api/booking.ts`) — the porting source of truth.

## 1. Goal & scope

Close out P5 by bringing the full money path to mobile:

1. **Booking form** — web parity + prefill, entered from a new **Book now**
   CTA on the tour-detail sticky bar.
2. **Hosted checkout via system browser** — Stripe / PayPal hosted pages
   (Expo Go forbids native payment SDKs; gateways reject custom-scheme
   return URLs).
3. **In-app payment result screen** that **self-verifies** — refetch +
   idempotent PayPal capture; never depends on the web success page having
   run.
4. **Bookings management in Account** — full web parity: list · detail ·
   Pay now / Cancel (PENDING) · Request cancellation (PAID) · refund states.

**Zero backend changes.** The API already supports everything
(`POST /bookings`, `/checkout`, `/capture`, `/cancel`,
`/cancellation-request`, `GET /bookings/me`, `GET /bookings/{code}`,
`GET /tours/{slug}/departures?status=OPEN`).

### Out of scope

- Native payment SDKs (Expo Go constraint) and gateway deep-links back into
  the app (a web "bounce page" redirecting to a deep link = backlog polish).
- Web's **private-departure request** mode (quote-based custom dates).
- Invoice/receipt download, booking push notifications.
- Lifting the pure booking helpers into `@tourism/core` (would touch web's
  money path; backlog refactor — mobile ports them locally for now).

## 2. Architecture overview

```text
tour detail ──Book now──▶ /tours/[slug]/book        (auth-gated form)
                              │ submit
                              ▼
                    createBooking (retry-once on USER_NOT_SYNCED)
                              │
                    startCheckout → { checkoutUrl }
                              │
              router.replace(/bookings/[code]/result?checkoutUrl=…)
                              │
                    result screen opens system browser
                    (expo-web-browser, awaits dismiss)
                              │ user pays (or abandons) + closes browser
                              ▼
                    SELF-VERIFY: refetch booking
                      └─ PayPal && still PENDING → POST capture
                         (idempotent) → refetch again
                              │
        ┌──── PAID ────┬───── PENDING ─────┬───── error ─────┐
        ▼              ▼                   ▼                 ▼
   confirmation   "still pending" +   retry verify      retry verify
   + view booking  Verify again / Pay now (reopen browser)
```

Key property: the app **owns verification**. The web `/checkout/success`
page may or may not have run in the browser (it also captures PayPal on
return) — the mobile capture call is idempotent on the API, so both racing
is safe. If the user closes the browser early, mobile's capture rescues the
PayPal order.

## 3. Data layer — `apps/mobile/src/lib/booking.ts` (+ `booking-form.ts`)

All pure logic **TDD** (specs in `apps/mobile/src/__tests__/`, never under
`src/app/`). Ported from web, kept behaviourally identical so the two
clients can't drift on the money path:

### 3.1 Pure helpers (ported, test-first)

- `buildCreateBookingPayload(raw) → { ok, payload } | { ok: false, error }`
  — trim/coerce/validate: party 1–20 adults + 0–20 children · provider
  `STRIPE | PAYPAL` · name ≥ 2 chars + email regex · drop empty optionals
  (port of `apps/web/src/lib/booking/booking-form.ts`; same
  `BookingFormError` codes so `messages.booking.errors` maps 1:1).
- `computeBookingTotal(departurePrice, adults, children) → { total, lines }`
  — children price = adult price (`childPriceRatio = 1`), money rounded
  half-up to 2 decimals (port of `apps/web/src/lib/booking/price.ts`).
  Client-side estimate only — the API recomputes the real charge.
- `toDepartureOptions(departures, basePrice) → DepartureOption[]` — label
  `"Fri, 15 Aug 2026"` (en-GB, **UTC** to avoid day-boundary off-by-one) ·
  effective price `priceOverride ?? basePrice` · `seatsLeft =
  max(0, seatsTotal - seatsBooked)`.
- `bookingStatusMeta(status) → { label, tone }` — labels from
  `messages.booking.list.status`; `BadgeTone` map: PAID→`success` ·
  PENDING→`warning` · CANCELLED→`muted` · REFUNDED /
  PARTIALLY_REFUNDED→`destructive`; unknown → CANCELLED fallback.
  Requires extending `@tourism/mobile-ui` `BadgeTone` with `muted` +
  `destructive` (both color pairs already exist in the RN theme; same
  `colors[tone]` / `colors[tone + '-foreground']` pattern).
- `toBookingVm(dto) → BookingVm` — code · tour title/slug · formatted
  departure + booked-on dates (UTC) · party line ("2 adults · 1 child") ·
  total + currency · status meta · payment provider ·
  `cancellationRequest?.status` · `refundedAmount?`.

### 3.2 Fetchers/mutations (thin wrappers over the typed core client)

- `fetchTourDepartures(slug)` — public, `?status=OPEN`, `[]` on error.
- `createBooking(payload)` — **retry-once on `USER_NOT_SYNCED`**: call
  `POST /auth/sync` then retry, exactly like web's `createBookingWithSync`.
- `startCheckout(code) → { checkoutUrl }`.
- `captureBooking(code)` — PayPal capture, idempotent on the API.
- `fetchMyBookings()` / `fetchBooking(code)` (404/403 → `null`).
- `cancelBooking(code)` (PENDING) ·
  `requestCancellation(code, { reason? })` (PAID).
- API error codes (`SEATS_NOT_AVAILABLE`, `DEPARTURE_NOT_OPEN`,
  `CHECKOUT_FAILED`, …) surface via `ApiRequestError.code` →
  `messages.booking.errors[code] ?? generic`.

Query keys: `['bookings','list']` · `['bookings', code]` ·
`['departures', slug]`. Mutations invalidate both booking keys.

## 4. Screens

All new screens follow the locked design language (Fraunces headings ·
Geist body · token colors only · `Screen` wrapper · device-polish
checklist: pressed states, hitSlop, themed RefreshControl,
`keyboardShouldPersistTaps`).

### 4.1 `tours/[slug]/book` — booking form (stack push, `ios_from_right`)

Entry: new **Book now** primary button on the detail sticky bar (Inquire
becomes secondary/outline beside it). Guest tap →
`/auth/sign-in?reason=booking` (sign-in modal shows a booking-specific
context line, same pattern as wishlist).

Sections (single scroll, one screen — native form, not web's two-column):

1. **Trip summary card** — hero thumb · title · duration ·
   from-price (reuses `TourCard`-style locked rows where sensible).
2. **Departure picker** — pressable cards (radio behaviour): date label ·
   effective per-person price · seats-left `Badge` (warning tone ≤ 5);
   `seatsLeft === 0` → disabled + "Sold out". Empty state = web copy
   `booking.box.noDepartures` + Inquire link. First open departure
   pre-selected.
3. **Travellers** — Adults / Children steppers (− / count / +):
   adults 1–20, children 0–20 (hint "Ages 2–11"), combined cap =
   selected departure's `seatsLeft`. Changing departure re-clamps.
4. **Contact** — `TextField`s prefilled from the `['profile']` query
   (name + email; phone empty) · special requests (multiline, optional).
5. **Payment method** — two radio cards: Card (Stripe) / PayPal, with the
   web hint lines + trust line copy.
6. **Sticky footer bar** — live `computeBookingTotal` ("Estimated total" +
   "Final amount is confirmed at payment") + **Confirm & pay** button
   (disabled while submitting; spinner label `form.submitting`).

Submit: validate via `buildCreateBookingPayload` (inline field errors) →
`createBooking` → `startCheckout` →
`router.replace('/bookings/[code]/result?checkoutUrl=…')`. API errors →
inline banner via `messages.booking.errors`.

### 4.2 `bookings/[code]/result` — payment result (self-verifying)

Reached by `router.replace` from the form (back never returns to a
submitted form) — and reusable later from "Pay now".

- On mount: opens `checkoutUrl` with
  `WebBrowser.openBrowserAsync(checkoutUrl)`; the promise resolves when the
  user closes the browser → run **verify**.
- **Verify:** refetch booking → if provider `PAYPAL` && status `PENDING` →
  `captureBooking(code)` (swallow errors — capture legitimately fails when
  the user abandoned) → refetch again.
- States:
  - **Verifying** — spinner + `booking.success.pendingTitle/pendingBody`.
  - **PAID** — success check icon · `booking.success.confirmedTitle/Body` ·
    facts (reference · tour · departure · travellers · total paid) ·
    email note · **View booking** + **Browse more tours**.
  - **Still PENDING** — explains no payment was taken yet
    (`booking.cancel.body` adapted) · **Verify again** · **Pay now**
    (re-`startCheckout` → reopen browser → verify loop) · View booking.
  - **Not found / error** — friendly retry.
- Android back / gesture from this screen goes to the bookings list
  (guarded — never back into the consumed form).

### 4.3 `bookings/index` — My bookings list

Entry: new **My bookings** row in the Account menu (above Saved). Signed-out
guests never reach it organically; direct/back navigation shows the same
`AuthGate` used by Saved.

- FlatList of booking cards: tour title · reference code · departure date ·
  status `Badge` (tone map) · total · "Booked {date}" · chevron → detail.
- Pull-to-refresh (themed) · skeleton / error / empty
  (`booking.list.empty` + Browse tours CTA) states — same 4-state pattern
  as Explore/Saved.

### 4.4 `bookings/[code]` — booking detail + actions

Facts block (web-parity fields: reference · tour (link) · departure ·
travellers · total · payment provider · contact · special requests) +
status badge, then **status-aware actions** (port of web
`BookingActions`):

- **PENDING** → **Pay now** (startCheckout → push result screen with the
  fresh `checkoutUrl`) + **Cancel booking** — destructive confirm via
  native `Alert.alert` (platform convention; web uses AlertDialog).
- **PAID** → cancellation-request panel: `REQUESTED` → status line
  `detail.requestPending`; `DENIED` → alert line + re-request; otherwise
  "Need to cancel?" explainer + reason textarea (optional) + Send request.
- **REFUNDED / PARTIALLY_REFUNDED** → refunded note with the amount
  (`refundedNote` / `partiallyRefundedNote`).
- **CANCELLED** (no refund) → read-only.

After any mutation: invalidate → UI re-renders from the fresh status.

## 5. Routing & navigation changes

- `apps/mobile/src/app/_layout.tsx`: register `tours/[slug]/book`,
  `bookings/index`, `bookings/[code]/index`, `bookings/[code]/result`
  as stack screens (push, `ios_from_right`; NOT modals — these are
  full task flows).
- Account screen: add **My bookings** `MenuRow`.
- Tour detail sticky bar: Book now (primary) + Inquire (secondary).

## 6. Dependency

- **`expo-web-browser`** (Expo Go-safe, SDK 54) — installed via
  `pnpm exec expo install expo-web-browser` from `apps/mobile` so the
  SDK-pinned version resolves. Jest: mock in specs (no native module).

## 7. i18n

- **Reuse web keys as-is:** `messages.booking.form/page/errors/success/
  cancel/list/detail`, `booking.box.noDepartures`.
- **Add `messages.mobile.booking`:** result-screen browser copy ("Complete
  your payment in the browser — we'll confirm here when you're back"),
  Verify again · stepper a11y labels · booking sign-in reason line
  (`mobile.authPrompts.bookingReason`).

## 8. Testing

Baselines before W4: mobile **67** · mobile-ui **31**.

- **TDD (red → green, per helper):** `booking-form.spec.ts` (port web's
  cases: coercion, party bounds, provider enum, contact, optional
  dropping) · `price.spec.ts` (rounding, children, zero-guards) ·
  `booking.spec.ts` (departure options: override/UTC label/seats clamp;
  status meta incl. unknown fallback; `toBookingVm`; USER_NOT_SYNCED
  retry-once with mocked client).
- **Component specs (RNTL, jest-expo):** book screen (departure select →
  price updates · stepper clamps to seatsLeft · validation errors ·
  submit calls create→checkout→replace; assert via `mock.calls[0][0]`) ·
  result screen (opens browser · PAID renders confirmation · PayPal+PENDING
  triggers capture · Verify again refetches) · bookings list (4 states) ·
  detail actions (PENDING shows Pay now/Cancel + `Alert.alert` spy ·
  PAID request flow · refunded note).
- Known jest gotchas apply: `gcTime: 0` for queries AND mutations ·
  testIDs over text queries where descendants collide · specs outside
  `src/app/` · mock `expo-web-browser`.

## 9. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Money path regression | Port web logic verbatim + TDD parity cases; **adversarial code review (/code-review) required before merge** (repo convention for payments). |
| User closes browser before paying | Result screen's PENDING state is honest ("no payment taken yet") + Pay now reopens checkout; API auto-releases stale PENDING bookings. |
| Double capture (web success page + app both capture) | API capture is idempotent — verified in P1 e2e. |
| Seats sell out between form open and submit | API rejects with `SEATS_NOT_AVAILABLE` → mapped inline error, picker refetches. |
| Browser dismiss ≠ payment done (Stripe webhook lag) | Verify shows "Confirming your payment…" + Verify again button (mirrors web success page's pending state). |

## 10. Verification plan

1. `/gate` (lint + typecheck + test + build) green.
2. **Adversarial review** of the diff (money path) before device testing.
3. On-device (Expo Go, Android): full Stripe **test-card** payment ·
   full PayPal **sandbox** payment · abandon-and-return (still PENDING →
   Pay now rescue) · cancel PENDING · request cancellation of the PAID
   booking (visible in admin queue) · guest gating on Book now.
4. Merge = rebase + `--ff-only` after user approval, then the standing
   docs sweep.
