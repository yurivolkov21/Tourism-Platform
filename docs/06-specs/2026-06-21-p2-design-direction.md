# Design Direction — P2 "Emerald Heritage" (light luxury)

**Date:** 2026-06-21 · **Phase:** P2 design system (the "gu" decided via frontend-design-direction).
**Status:** DECIDED — pending implementation (token-value swap; no structural change).

> The token *architecture* is already on `main` (PR1–PR3, neutral values). This locks the **brand
> values** to swap in. Because everything routes through `@tourism/tokens`, this is a values-only change.

## Decision

- **Visual direction:** Light luxury / refined (photo-forward, restrained, generous whitespace,
  high trust). Customer web is expressive-but-elegant; **admin stays quiet/dense** (shared tokens +
  `data-density="compact"`). Light mode is primary (dark mode supported, not default).
- **Palette — "Emerald Heritage":** deep emerald primary · ivory/warm neutrals · brass/copper accent.
- **Typography:** heading = **Fraunces** (old-style serif, characterful); body = **Geist** (sans).
- **Shape:** refined small radius (**`--radius` 0.625rem → 0.375rem**), thin hairline borders.

## Token values (proposed, oklch — tune during implementation)

| Role | Light | Dark |
| --- | --- | --- |
| primary (emerald) | `oklch(0.42 0.08 155)` | `oklch(0.70 0.10 155)` |
| primary-foreground | `oklch(0.98 0.01 95)` | `oklch(0.20 0.02 155)` |
| background (ivory) | `oklch(0.98 0.008 95)` | `oklch(0.16 0.01 160)` |
| foreground (ink) | `oklch(0.22 0.01 150)` | `oklch(0.96 0.01 95)` |
| accent (brass) | `oklch(0.72 0.10 80)` | `oklch(0.76 0.10 80)` |
| rating (align to brass/gold) | `oklch(0.74 0.11 82)` | `oklch(0.80 0.12 82)` |
| muted / card / border | warm-tinted neutrals derived from the ivory base (low chroma, hue ~95–150) | dark emerald-tinted |

Keep functional `success / warning / info / destructive` as-is. `price` = foreground; `price-compare`
= muted-foreground (unchanged).

## Memorable detail (proposed — confirm at implementation)

A consistent **brass hairline + Fraunces** signature: section headings in Fraunces with a short brass
underline accent; prices/rating numerals in Fraunces; thin brass dividers between editorial blocks.
(One restrained signature, not applied everywhere — per anti-template rules.)

## Implementation outline (next PR, code)

1. Swap color values in `libs/shared/tokens/style-dictionary/tokens.mjs` (emerald/ivory/brass, light+dark)
   - `radius.DEFAULT → 0.375rem`; regenerate `tokens.css`.
2. Load **Fraunces** via `next/font/google` in web + admin layouts → bind to `--font-heading`; set the
   `--font-heading` theme token to `var(--font-heading)` (currently aliases `--font-sans`). Apply
   `font-heading` to headings (base layer or composite text styles).
3. Verify contrast (AA) on emerald/brass pairs; `pnpm check:no-hex`; gate; visual review at `/ui-check`.
4. Branch → gate → review → rebase-merge.

## Out of scope

- Real product pages / components beyond the smoke check.
- Per-component restyling (happens in P3 web build).
