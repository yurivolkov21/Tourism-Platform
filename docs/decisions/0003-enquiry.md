# ADR-0003 — Enquiry / "Inquire Now" lead capture (D2)

**Status:** Accepted · **Date:** 2026-06-14

## Context

Lily converts largely via chat/lead forms. We keep **self-serve Stripe booking as
primary** (our edge), but want an on-brand, low-cost lead channel for custom trips.

## Decision

Add a lightweight **`Enquiry`** model (`name, email, phone, message, tourId?,
status`) + an "Inquire Now" form. Self-serve checkout stays the primary path.

## Consequences

- Cheap lead channel alongside booking; needs a status workflow (see D-P1.4).
- Admin gets an enquiry inbox (P1.7 / P4).
