# ADR-0004 — admin may reuse web/ui (D3)

**Status:** Accepted · **Date:** 2026-06-14

## Context

`admin` is a Next.js/React app like `web`. BLUEPRINT §3 defined boundaries for
web/mobile/shared but was silent on admin. Question: should admin get its own UI
lib or reuse the web design system?

## Decision

Allow **`scope:admin` → `scope:admin`, `scope:web`, `scope:shared`** so admin
reuses `@tourism/ui` instead of duplicating it. No separate `admin/ui` lib for now.

## Consequences

- Less duplication; admin tracks the web design language.
- Slightly looser boundary (admin depends on web). Enforced in `eslint.config.mjs`.
- Revisit if admin needs a visually distinct system.
