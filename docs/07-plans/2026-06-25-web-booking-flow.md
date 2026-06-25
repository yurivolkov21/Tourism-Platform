# Implementation plan — Web booking flow (increment-2)

> Spec: [`2026-06-25-web-booking-flow-design.md`](../06-specs/2026-06-25-web-booking-flow-design.md)
> Branch: `feat/web-booking-flow` · TDD on the two pure helpers · one commit per task group.

## Reused seams (touch, don't rebuild)

- BE bookings/payments (P1.5) — `POST /bookings`, `/bookings/{code}/checkout|capture`, `GET /bookings/{code}`,
  `GET /tours/{slug}/departures`. Don't change beyond the one `success_url` tweak.
- Auth foundation (inc-1) — `lib/supabase/server.ts`, the proxy, the session. Mirror admin's authed
  `lib/api/client.ts` for the web's authed client.
- `@tourism/ui` (Input/Button/Label/Card/RadioGroup/Select), `@tourism/i18n`, brand tokens / no-hex.
- `components/tours/booking-box.tsx` — swap the UI-only "Request to book" for the real CTA.

## Tasks (dependency-ordered)

### B0 — BE: code on Stripe success_url  ·  commit "stripe success_url carries booking code"
- `bookings.service.ts`: append `&code=${booking.code}` to the Stripe `successUrl`. Update/extend the
  unit test. **Accept:** `nx test @tourism/api` green.

### B1 — Authed client + pure helpers (TDD)  ·  commit "booking helpers + authed client"
- `lib/api/authed-client.ts` (createApiClient + getToken from server Supabase session).
- **RED→GREEN:** `lib/booking/price.spec.ts` + `price.ts` (`computeBookingTotal`); `lib/booking/booking-form.spec.ts`
  + `booking-form.ts` (`buildCreateBookingPayload`). **Accept:** `nx test @tourism/web` green; ≥80% on both.

### B2 — Booking server actions  ·  commit "booking actions (create + checkout + capture)"
- `lib/booking/actions.ts`: `createAndCheckout(_prev, formData)` → validate → `POST /bookings` →
  `POST /bookings/{code}/checkout` → `redirect(checkoutUrl)`; `captureBooking(code)` → `POST .../capture`.
  Errors mapped to friendly EN. **Accept:** typecheck/build green; `'use server'`.

### B3 — Booking page + form + auth-gate + i18n  ·  commit "booking page + form"
- `app/tours/[slug]/book/page.tsx` (server: read user → redirect `/login?redirect=…` if none; fetch tour
  + departures; preselect `?d=`). `components/booking/{booking-form,order-summary,departure-picker}.tsx`.
  Add `/tours/:slug/book` to `proxy.ts` matcher. Add `messages.booking`. **Accept:** build green; signed-out
  → `/login`; no-hex clean.

### B4 — Checkout result pages  ·  commit "checkout success + cancel"
- `app/checkout/success/page.tsx` (read `GET /bookings/{code}`; PayPal+PENDING → `captureBooking` → re-read;
  Stripe PENDING → "confirming…" + refresh). `app/checkout/cancel/page.tsx` (retry link). **Accept:** build green.

### B5 — Wire the BookingBox CTA  ·  commit "tour BookingBox → real booking flow"
- `components/tours/booking-box.tsx`: departure select + party size → link/submit to `/tours/[slug]/book?d=…`.
  **Accept:** build green; tour detail still SSG.

### B6 — Gate + e2e + review  ·  commit "booking gate + e2e"
- `/gate` (lint/typecheck/test/build) + `check:no-hex`. Playwright: booking page redirects to `/login`
  signed-out; form renders. **Note:** full pay path (Stripe/PayPal + webhook/capture) = manual/deferred
  (needs live test creds). **STOP for review** before merge.

## Sequencing
B0 (independent) → B1 → B2 → B3 → B4 → B5 → B6. B1 can interleave with B0.

## Out of scope (this increment)
My-bookings list/account content; cancel/refund UI; promo codes; saved travellers; guest checkout.
