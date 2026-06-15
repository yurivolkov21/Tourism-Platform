# ADR-0001 — Greenfield rebuild + donor as read-only reference

**Status:** Accepted · **Date:** 2026-06-14

## Context

The previous build (`tourism-be-api`) has hardened infra (Supabase JWT, Stripe
webhook idempotency, pooler, ~324 tests) but a data model + FE that accreted from
hasty decisions. We want a clean data model, mobile from day one, and a shared
reuse layer the old repo never had.

## Decision

Stand up a **brand-new Nx + pnpm monorepo** and keep the old repo as a **frozen,
read-only "donor"** — port proven code from it, never modify it.

## Consequences

- Clean slate for model + FE; donor is a zero-risk safety net to port from.
- Discipline required: do not re-derive solved infra; do not edit the donor.

See [BLUEPRINT §1–§2](../BLUEPRINT.md).
