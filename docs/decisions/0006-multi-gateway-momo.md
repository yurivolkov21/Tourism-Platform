# ADR-0006 — Multi-gateway payments: Stripe + MoMo (was D-P1.7)

**Status:** Accepted · **Date:** 2026-06-15

## Context

Stripe alone blocks domestic Vietnamese customers (many have no international
card). A VN-market tourism product needs a local rail. Chosen: **MoMo**.

## Decision

Support **two payment providers**, provider-agnostic at the data layer:

- **Stripe** — international customers (hosted Checkout, port from donor).
- **MoMo** — VN domestic (MoMo one-time payment + IPN callback).
- **Booking** becomes provider-neutral: add `paymentProvider` enum
  (`STRIPE` | `MOMO`) + generic `providerSessionId` / `providerPaymentId`
  (replaces the donor's Stripe-specific columns).
- **Each provider:** its own webhook/IPN endpoint with **signature verification**
  (Stripe HMAC on raw body; MoMo HMAC-SHA256 over the documented field set) and
  its own rows in the idempotency log (`PaymentEvent.provider`).
- Seat-reservation + idempotency logic stays shared (provider only differs at
  verify + amount formatting).

## Consequences

- Schema change on `Booking` + `PaymentEvent` (add `provider`).
- Two webhook handlers; a shared post-payment "confirm booking" core.
- Amount formatting must respect each provider's currency rules (see ADR-0008 /
  zero-decimal currency for VND under MoMo).
- MoMo creds added to env (Joi) + `.env`.
