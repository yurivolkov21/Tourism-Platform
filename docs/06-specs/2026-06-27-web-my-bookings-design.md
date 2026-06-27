# Design + plan — Web "My bookings" (account/bookings)

> Status: execute · Branch: `feat/web-my-bookings` · Date: 2026-06-27
> Small slice after the booking flow (inc-2): let a signed-in customer see the trips they've booked.

## Goal & scope

A signed-in customer opens **My bookings** and sees their bookings (newest first), each showing the
tour, departure date, status, party size, reference and total. Read-only this slice.

**Locked decisions (from product):**
- PENDING bookings show a **status badge only** (no "Pay now" re-checkout yet).
- **No per-booking detail page** — each card links to the tour (`/tours/[slug]`).
- Route is **`/account/bookings`** (already gated by the `proxy.ts` `/account/:path*` matcher — no proxy change).

## Backend contract (ready, P1.5)

- `GET /api/v1/bookings/me` (auth, **no params**) → `BookingDto[]`, newest first, top 50. Enveloped →
  unwrap `.data`. Reuse `authedJson` (native fetch — Vercel body gotcha doesn't apply to GET, but the
  helper already reads the Bearer token).
- `BookingDto` fields used: `code`, `status`, `numAdults`, `numChildren`, `totalAmount`, `currency`,
  `tour {slug,title}`, `departure {startDate}`, `createdAt`.

## Per-area

- **Data:** `lib/api/booking.ts` → `fetchMyBookings(): Promise<BookingDto[]>` (`[]` on error).
- **Pure helpers (TDD):** `lib/booking/my-bookings.ts`
  - `formatTripDate(iso)` → "24 Jul 2026" (UTC).
  - `travellersLabel(adults, children)` → "2 adults · 1 child".
  - `bookingStatusBadge(status)` → `{ label, tone }` (tone = token class for the Badge).
- **Page:** `app/account/bookings/page.tsx` (server, `force-dynamic`, `getUser` redirect defence-in-depth)
  → fetch + render. Empty state → "No bookings yet" + Browse tours CTA.
- **Components:** `components/booking/booking-card.tsx` (presentational). Status badge + fields; reuse
  `@tourism/ui` Badge/Card + `formatPrice` (from order-summary).
- **Entry points:** "My bookings" link in the User menu (desktop + mobile) and on `/account`.
- **i18n:** `messages.account.bookings.*` (title, empty, browse, statusLabels, field labels). EN-only.

## Out of scope
Pay-now re-checkout · per-booking detail page · cancel/refund UI · pagination (BE caps at 50).

## Testing
Unit (TDD) on the three pure helpers. Gate (lint/typecheck/test/build) + `check:no-hex` green. Live
list render = manual (needs a signed-in user with bookings — we have several PAID test bookings).
