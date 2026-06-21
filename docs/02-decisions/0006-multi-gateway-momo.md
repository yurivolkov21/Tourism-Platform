# ADR-0006 — Multi-gateway payments: Stripe + PayPal (was Stripe + MoMo)

**Status:** Accepted · **Date:** 2026-06-15 · **Amended:** 2026-06-16 (MoMo → PayPal)

## Amendment (2026-06-16) — second rail is **PayPal**, not MoMo

The original decision paired Stripe with **MoMo** for a "VN domestic" rail. On
revisiting the audience (P1.5 kickoff), the product targets **inbound foreign
tourists travelling to Vietnam**, not domestic buyers. MoMo is a Vietnamese
e-wallet requiring a local phone + bank link — **foreign travellers effectively
can't use it**, so it would be effort (and webhook/IPN attack surface) for ~zero
conversion in the target segment.

**Replace MoMo with PayPal** as the second rail:

- Stripe already covers international cards (Visa/MC/Amex) + wallets.
- **PayPal** adds a globally-trusted, cross-border-friendly option that lifts
  conversion for travellers who won't hand card details to an unfamiliar site.
- The data layer is **already provider-neutral**, so this is a small change:
  enum value `MOMO` → `PAYPAL` (no data yet), a `PayPalService` + webhook in
  place of MoMo IPN. The gateway abstraction **stays open** so a VN rail
  (MoMo / VNPay) can be added later if a domestic push happens.

Sequencing: **P1.5a** bookings core → **P1.5b** Stripe → **P1.5c** PayPal.
A future ADR may add a VN domestic rail; this one no longer mandates MoMo.

## Context (original)

Stripe alone blocks domestic Vietnamese customers (many have no international
card). A VN-market tourism product needs a local rail. *(Superseded: the target
segment is inbound foreign tourists — see amendment.)*

## Decision (as amended)

Support **two payment providers**, provider-agnostic at the data layer:

- **Stripe** — international cards / wallets (hosted Checkout, port from donor).
- **PayPal** — international travellers preferring PayPal (was: MoMo for VN domestic).
- **Booking** is provider-neutral: `paymentProvider` enum (`STRIPE` | `PAYPAL`)
  plus generic `providerSessionId` / `providerPaymentId` (replaces donor's
  Stripe-specific columns).
- **Each provider:** its own webhook endpoint with **signature verification**
  (Stripe HMAC on raw body; PayPal webhook signature verification) and its own
  rows in the idempotency log (`PaymentEvent.provider`).
- Seat-reservation + idempotency logic stays shared (provider only differs at
  verify + amount formatting).

## Consequences

- Schema: `PaymentProvider` enum `MOMO` → `PAYPAL` (migration; no data yet).
  `Booking` + `PaymentEvent` already carry `provider` — no structural change.
- Two webhook handlers; a shared post-payment "confirm booking" core.
- Amount formatting respects each provider's currency rules (mostly USD now;
  `toProviderAmount` / zero-decimal handling kept for generality — ADR-0008).
- **PayPal** creds added to env (Joi) + `.env`; MoMo creds no longer needed.
  Operational check: PayPal Business account + payout to a VN bank.
- The gateway abstraction remains open for a future VN domestic rail.
