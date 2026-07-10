# Trust band — editorial inline redesign

**STATUS: SHIPPED 2026-07-10** — implemented on `feat/trust-band-editorial`, merged to `main` (design approved by the user; visual review on the deployed home pending)

## Why

The shipped TrustBand (floating emerald card) reads as an unfinished placeholder:
too much dead space, pale icon discs, and a real rendering bug — the marquee's
edge fades use `from-card` on a gradient background, painting two opaque white
boxes over the payment logos. Five logos are also too few for a marquee (huge
gaps). The user picked option **A — editorial inline** (Tailark/shadcnblocks
"stats inline" pattern) over a photo panel or merging into `WhyChoose`.

## Design (applies to Home + About — both render `TrustBand`)

- Drop the floating `rounded-3xl` card. Content sits directly on
  `bg-background` between **two hairlines** (`border-y`).
- **lg+**: 2-col grid. Left: existing eyebrow + a NEW one-line Fraunces
  heading (`messages.trustBand.heading`):
  *"Boutique journeys, trusted by travelers across Vietnam."*
  Right: the 3 live stats separated by vertical hairline dividers — big
  Fraunces number + muted label. Icon discs are removed.
- **Mobile**: stacked/centered; stats stay in one row and wrap gracefully.
- **Count-up**: REUSE the existing `NumberTicker` (`@tourism/ui`, rAF-based,
  SSR/no-JS renders the final value, reduced-motion aware) through the existing
  `MetricValue` wrapper — `parseMetric` already handles `"22"` and `"4.4★"`
  (star = suffix, decimals inferred). No new components, no data-shape change.
- **Payments**: marquee + edge fades deleted (bug gone). The 5 monochrome
  self-hosted masks render as a **static centered row** below the bottom
  hairline, with the security caption under it. `Marquee` itself stays
  (Contact still uses it).
- Data flow unchanged: `fetchTrustStats` → `buildTrustStats`; band still
  hidden when `stats.length === 0`.

## Code changes

| File | Change |
| --- | --- |
| `libs/shared/i18n` | + `trustBand.heading`. |
| `apps/web .../stat-cluster.tsx` | Rewrite: inline stats with dividers + `MetricValue` count-up, no icons. |
| `apps/web .../payment-marquee.tsx` | → `payment-row.tsx`, static row, no fades. |
| `apps/web .../trust-band.tsx` | New border-y grid layout with the heading. |
| specs | `trust-band.spec.tsx` updated (heading, no marquee); `@tourism/ui` jest mock gains a `NumberTicker` stub (barrel is mocked under jsdom). |

`trust-band.ts` / `buildTrustStats` are untouched — `MetricValue`+`parseMetric`
already animate the existing string values.
