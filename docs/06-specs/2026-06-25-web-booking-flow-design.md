# Design spec — Web booking flow (Booking + Account, increment-2)

> Status: draft for review · Branch: `feat/web-booking-flow` · Date: 2026-06-25
> Second slice of **Booking + customer auth**. Auth foundation (increment-1) is merged; the booking
> backend (P1.5 bookings + Stripe + PayPal) is done. This wires the **web** booking → pay → confirm flow.

## Goal & scope

Let a signed-in customer book a tour end to end: pick a departure + party size + contact details,
create a booking, pay via **Stripe or PayPal** (buyer picks), and land on a **confirmation** page.

**Locked decisions (from product):**
- **Login required** to book (matches BE: `POST /bookings` needs a CUSTOMER JWT). Not signed in →
  redirect to `/login?redirect=<booking page>` then back.
- **Both gateways**, buyer chooses on the booking form (`paymentProvider` is set at create).
- **Scope = book → pay → confirm.** "My bookings" list (`/bookings/me`) is a later slice (NOT here).

## Backend contract (already built — do not change beyond the one tweak below)

- `GET /tours/{slug}/departures` → open departures for the tour (date, seats, price).
- `POST /bookings` (auth) — body `CreateBookingDto`: `tourSlug`, `departureId`, `numAdults` (1–20),
  `numChildren?` (0–20), `paymentProvider` (`STRIPE|PAYPAL`), `contactName`, `contactEmail`,
  `contactPhone?`, `specialRequests?`. Returns `BookingDto` (`code`, `status: PENDING`, `totalAmount`,
  `currency`, …). `userId`/`totalAmount`/`currency`/`code`/`status` are server-controlled.
- `POST /bookings/{code}/checkout` (auth) → `CheckoutSessionDto { checkoutUrl, bookingCode, status }`;
  FE redirects the browser to `checkoutUrl`.
- `POST /bookings/{code}/capture` (auth) — **PayPal** return: finalises the order → PAID.
- `GET /bookings/{code}` (auth) → `BookingDto` for the confirmation page.
- **BE result URLs (fixed, built from `FRONTEND_URL`):** Stripe success
  `/checkout/success?session_id={CHECKOUT_SESSION_ID}`, PayPal return `/checkout/success?code=<code>`,
  cancel `/checkout/cancel?code=<code>`. Stripe confirms via **webhook** (server-side → PAID).

### One BE tweak (apps/api is ours, editable)

Stripe's `success_url` currently lacks the booking code (only `session_id`). Add `&code=${booking.code}`
to it in `bookings.service.ts` so `/checkout/success` always knows which booking to show. One-line change.

## Flow

1. **Tour detail → BookingBox** ("Book this tour"): pick a departure (from `GET /tours/{slug}/departures`)
   + adults/children → go to the booking page (carry `?d=<departureId>`). (Replaces the UI-only
   "Request to book → #contact".)
2. **Booking page `/tours/[slug]/book`** (auth-gated): summary (tour + chosen departure + live price) +
   form (party size, contact name/email/phone, special requests, **gateway radio: Stripe | PayPal**).
   Not signed in → server redirect to `/login?redirect=/tours/[slug]/book?d=…`.
3. **Submit** (server action): `POST /bookings` → `POST /bookings/{code}/checkout` → `redirect(checkoutUrl)`.
4. **Gateway** (Stripe Checkout / PayPal) → returns to:
   - `/checkout/success?code=<code>[&session_id=…]` — server reads `GET /bookings/{code}`:
     - **PayPal + PENDING** → call `POST /bookings/{code}/capture`, re-read.
     - **Stripe** → webhook flips to PAID; if still PENDING, show "confirming…" with a refresh
       (or short client poll). Show the confirmed booking (code, tour, date, total, contact).
   - `/checkout/cancel?code=<code>` — "Payment cancelled", link back to the booking page to retry.

## Per-area design

- **Auth-gate the booking route:** add `/tours/:slug/book` to the `proxy.ts` matcher (currently
  `/account` only) AND a server-side `getUser()` redirect on the page (defence in depth).
- **Authed API client for the web:** add `lib/api/authed-client.ts` (mirrors admin's — `createApiClient`
  with `getToken` from the server Supabase session). The booking create/checkout/capture/read all use it.
- **Pure helpers (TDD):**
  - `lib/booking/price.ts` `computeBookingTotal(departurePrice, numAdults, numChildren, childRule)` →
    total + a per-line breakdown (children rule = same as adult unless the departure/tour says otherwise;
    keep simple: adults×price + children×price, server is the source of truth for the real charge).
  - `lib/booking/booking-form.ts` `buildCreateBookingPayload(form)` → maps the form to `CreateBookingDto`
    (trim, coerce ints, drop empty optionals, validate party size 1–20 / children 0–20, gateway enum).
- **Components:** `components/booking/booking-form.tsx` (client, `useActionState`), departure picker,
  order summary; `components/booking/checkout-result.tsx` (status display). Reuse `@tourism/ui`.
- **i18n:** `messages.booking.*` (form labels, gateway, summary, success, cancelled, errors). EN-only.

## In scope / out of scope

**In:** booking page + form + departure pick + order summary; create+checkout server action; Stripe +
PayPal; `/checkout/success` (+ PayPal capture) + `/checkout/cancel`; auth-gating; authed client; the two
pure helpers (TDD); the one BE `success_url` tweak; `messages.booking`.

**Out:** "My bookings" list / account content; booking cancel/refund UI; promo codes; multi-currency UI;
saved travellers; guest checkout (login required).

## Testing

- **Unit (TDD):** `computeBookingTotal` (party sizes, zero children, rounding) + `buildCreateBookingPayload`
  (mapping, coercion, optional dropping, invalid party size).
- **Build/gate:** `lint typecheck test build` + `check:no-hex` green.
- **e2e / real pay:** the full Stripe/PayPal redirect + webhook/capture path needs **live test creds +
  the API running** → manual/deferred (document; don't fake). Playwright can cover: booking page redirects
  to `/login` when signed out; form renders + client validation.

## Risks / mitigations

- **Stripe success lacks code** → the one BE `success_url` tweak (above).
- **Webhook lag on Stripe success** → confirmation page tolerates PENDING (shows "confirming…", refresh /
  short poll); never claims PAID it can't see.
- **Double PayPal capture** (page reload) → BE capture must be idempotent (PAID → no-op); FE only captures
  when PayPal + PENDING.
- **Auth token in server actions** → authed client reads the token per-call from the server Supabase
  session (same proven pattern as admin).
- **ISR preserved** → only `/tours/[slug]/book` + `/checkout/*` are dynamic (auth/runtime); the public
  catalog pages stay static.
- **Env:** needs Supabase keys in `apps/web/.env` (login) + Stripe/PayPal test creds on the API + a public
  `FRONTEND_URL` matching the web origin. Running the real flow is env-dependent.

## Planned files (execution)

- BE: `apps/api/src/modules/bookings/bookings.service.ts` (+`&code=` on Stripe success_url) + a test.
- `apps/web/src/lib/api/authed-client.ts`.
- `apps/web/src/lib/booking/{price.ts (+spec), booking-form.ts (+spec)}`.
- `apps/web/src/lib/booking/actions.ts` (`createAndCheckout`, `captureBooking`).
- `apps/web/src/app/tours/[slug]/book/page.tsx` + `components/booking/booking-form.tsx` (+ summary, picker).
- `apps/web/src/app/checkout/success/page.tsx`, `apps/web/src/app/checkout/cancel/page.tsx`.
- Edit: `apps/web/src/proxy.ts` (matcher + `/tours/:slug/book`), `components/tours/booking-box.tsx`
  (real CTA), `libs/shared/i18n/src/lib/messages.ts` (`booking`).
