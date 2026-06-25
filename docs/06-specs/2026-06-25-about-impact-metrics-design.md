# About metrics — "About Us 01 / Impact Metrics" layout

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `fix/about-impact-metrics`

Replace the card-grid `ByTheNumbers` with the Shadcn Space **"About Us 01 –
Impact Metrics"** layout, kept honest and brand-tokenized.

## Changes

- `ByTheNumbers` rebuilt to the block's layout: a centred lead heading flowing
  into **brand keyword pills**, then a row of **big count-up figures** with
  dividers — adapted to **4 columns** (our real metrics) instead of the sample's 3.
- Real data kept: the page still passes the four computed values (tours ·
  destinations · regions · rating); the big numbers reuse `MetricValue`
  (NumberTicker) for the count-up + decimal/star handling — **no `motion/react`
  dependency** and **no fabricated "+"** prefix.
- Pills use **brand tokens** (primary / rating / info) + the existing
  `font-heading` italic (no Google `Instrument_Serif`); icons Landmark · Compass ·
  Leaf. i18n `about.metrics` now carries `heading` + `pills` + `labels`.

## Decisions (confirmed)

- Drop the "+" prefix (exact real numbers). Pills in brand tokens + existing serif
  (not the sample's multicolour + Instrument Serif).
- Content: heading "Unhurried, local-led journeys across Vietnam — built on" +
  pills Heritage · Local experts · Slow travel (editable copy).

## Verification

web jest 56, lint/build/no-hex green; built against the live API — heading, pills,
real labels render and no "+NN" appears.
