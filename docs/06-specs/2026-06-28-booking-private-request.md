# Design + plan — Booking page redesign + "Private departure" request

> Status: awaiting approval · Branch: `feat/booking-private-request` · Date: 2026-06-28

## Problem

Bookings require an existing admin-created `TourDeparture` (fixed dates). A time-constrained inbound
(FIT) traveller whose dates don't match the scheduled departures hits a dead end → lost customer.

## Goal

On `/tours/[slug]/book`, offer **two modes via a toggle**, in a cleaner **sectioned** layout
(Shadcn "Form Layout 2" `Field*` primitives). Never a dead end. Surface the private option on the tour
page too ("two ways to travel", Shadcn "Pricing 01" adapted). **Don't break the live-tested paid flow.**

## Two modes (toggle at the top of the form)

| | **Scheduled departure** (default) | **Private — your own dates** |
| --- | --- | --- |
| Dates | existing departure dropdown | **Calendar** preferred start date; end auto-shown from the tour's `durationDays` |
| Party | adults / children | adults / children (→ `groupSize`) |
| Action | pay now (Stripe / PayPal) — **unchanged logic** | **Request a quote** → `POST /enquiries` |
| Summary (right) | trip + estimated total + "Continue to payment" | "Price on request · we confirm within 24h" |
| Backend | creates a `Booking` (as today) | creates an `Enquiry` (model already has `tourId` + `travelDate` + `groupSize`) — **no BE change** |

A one-line note under the toggle: *"Private tours are quote-based — we confirm within 24h, no payment
now."* When the tour has **no open future departures**, default the toggle to **Private** + a
"No scheduled dates right now — request your own." note.

### Mode B date capture (decided)

Single **preferred start date** (→ `Enquiry.travelDate`); the form shows the derived end date
("ends ~{date} · {durationDays} days") since the tour length is fixed; flexibility / a different return
go in the free-text message. Rationale: accurate (fixed duration), maps to the single-date model with
zero BE change, simplest UX.

## Sectioned layout (both modes, Form Layout 2 style)

Section = left label/description + right fields, separated by `Separator`. Built with `@tourism/ui`
`Field` / `FieldSet` / `FieldLegend` / `FieldGroup` / `FieldLabel` (all already exported).

- ① **Your dates** — mode-specific (dropdown vs calendar) + adults/children.
- ② **Travellers** — full name · email · phone · (Mode B: nationality optional).
- ③ **Payment** (Mode A: Stripe/PayPal radio) / **Trip preferences** (Mode B: special requests).

## Tour page — "Two ways to travel" (Pricing 01 adapted, light)

Two cards near the BookingBox: **Join a scheduled departure** (from $X · instant) vs **Private
departure** (your dates · request). Each links to `/book` (Private card → `/book?mode=private`). Brand
tokens, no raw palette; lightweight (no full pricing section).

## Risk management (non-negotiable)

- **Mode A keeps its exact logic** — same hidden inputs (`departureId`, party, gateway), same server
  action, same Stripe/PayPal path (verified live). Only its *layout* moves into the sectioned shell.
- **Mode B is purely additive** — a separate branch that submits an enquiry (reuse `lib/api/enquiry.ts`);
  it never touches the booking/payment code.
- Login stays required for both (the page already gates via `getUser` + proxy).

## Increments

1. **Sectioned shell + toggle (Mode A only):** restructure the existing form into `Field*` sections +
   a mode toggle (Scheduled active; Private disabled/placeholder). Verify the **paid flow still works**
   end-to-end before adding Mode B.
2. **Mode B (private request):** calendar start date + derived end + party + details → enquiry submit;
   morph the right summary + CTA. Empty-departures default to Private. i18n.
3. **Tour page "two ways to travel"** cards + the Private CTA (`?mode=private` preselects Mode B).
4. Gate + (manual) re-verify a real scheduled booking + a private request enquiry on prod.

## Out of scope

Instant self-checkout for private tours (quote-based by design); a date-range picker; changing the
`Enquiry` schema; admin "create departure from enquiry" automation (admin already sees the lead).

## Testing

TDD any new pure helper (e.g. derived end-date / payload builders). Gate + `check:no-hex`. Manual:
scheduled paid flow unchanged + private request lands as an enquiry with `tourId`/`travelDate`/`groupSize`.
