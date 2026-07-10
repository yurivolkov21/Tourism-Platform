# Home trust band — replacing the "Built with" tech marquee

**Status:** Design approved (D1) · 2026-07-10 · awaiting spec review → plan
**Surface:** `apps/web` home (`/`), with a scope decision for the About page.

## Problem

The home page renders `TechCloud`
([tech-cloud.tsx](../../apps/web/src/components/marketing/tech-cloud.tsx)) — a
**coloured marquee of the dev tech stack** (Next.js, NestJS, Prisma, Stripe, …)
under an eyebrow "BUILT WITH", with logos pulled at runtime from the external CDN
`cdn.simpleicons.org`. The About page carries a monochrome sibling
(`BuiltWith` → `TechMarquee`).

Three problems:

1. **Wrong audience.** "Built with [dev tools]" is a developer-portfolio pattern.
   Nexora sells tours to travelers; the tech stack means nothing to them.
2. **Reads cheap / untrustworthy.** Loud full-colour logo badges in a big band
   are the visual signature of low-quality knock-off e-commerce.
3. **External runtime dependency.** Logos load from a third-party CDN.

## Goal

Replace the home tech strip with a **credible, on-brand trust band** built from
**real, honest signals** and premium restraint (monochrome, dark, breathing) —
the pattern real travel sites (GetYourGuide, Viator, Booking) use.

## Approved design — "D1"

A full-width **dark emerald-charcoal band** (`~#15211c`, ties to the "Emerald
Heritage" brand), placed where `TechCloud` sits today (the breather between the
image-led hero and the sections below). Centered, generous vertical padding.
Top-to-bottom:

1. **Eyebrow** — "Why travelers choose Nexora" (emerald, uppercase, letter-spaced).
2. **Floating stats** — a centered row, **no dividers**, wide gaps, wraps
   gracefully. Each stat = a large serif (Fraunces) number + a muted label.
   Figures are **real, computed live** from the DB (see below).
3. **Hairline divider** (subtle, low-contrast).
4. **Monochrome payment marquee** — `VISA · Mastercard · American Express ·
   PayPal · Stripe`, one muted ink, wide gaps, continuous horizontal scroll,
   edge fades, **pause-on-hover**, **disabled under `prefers-reduced-motion`**.
   Reuses the shared `Marquee`
   ([marquee.tsx](../../apps/web/src/components/marketing/marquee.tsx)).
5. **Security caption** — "Every booking secured by Stripe & PayPal · SSL encrypted".

Optional micro-interaction: a logo recolours to its brand colour on hover.

### Real data (verified from the seed fixtures, 2026-07-10)

| Metric | Real value |
| --- | --- |
| Tours | **23** |
| Destinations | **16** (across 3 regions: Northern / Central / Southern Vietnam) |
| Reviews | **26**, average rating **4.38 → 4.4★** |

**Stats to show (locked): three strong, honest figures —
`23 curated tours · 16 destinations · 4.4★ average rating`.** The 26-review
count is real but modest, so it is dropped from the row (the rating implicitly
represents the reviews). All figures are computed **server-side at request time**
so they track the live DB rather than being hard-coded.

### Honesty constraints (non-negotiable)

- **No fabricated numbers.** The mockup's `4.8 / 190+` were placeholders; the
  build uses the real `4.4★ / 26`.
- **Only real payment methods.** Stripe is configured `payment_method_types:
  ['card']` (Visa/Mastercard/Amex) + PayPal. No Apple Pay / Google Pay / Discover
  unless verified as enabled. "Stripe" appears as the processor.
- **No fabricated partner/press/client logos.**

## Components & structure

- **New:** `apps/web/src/components/marketing/trust-band.tsx` — replaces
  `TechCloud` in [page.tsx](../../apps/web/src/app/page.tsx). Internally:
  - `StatCluster` — pure presentational, takes `stats: { value: string; label: string }[]`.
  - `PaymentMarquee` — wraps the shared `Marquee`; renders self-hosted logos.
- **Logos self-hosted:** SVGs under `apps/web/public/logos/pay/`
  (`visa`, `mastercard`, `amex`, `paypal`, `stripe`), rendered as a single
  monochrome ink (CSS `mask` or tinted `<img>`). **Removes the
  `cdn.simpleicons.org` runtime dependency.**
- **Copy** centralized in `@tourism/i18n` (EN-only): replace `messages.techCloud`
  with `messages.trustBand` (eyebrow, stat labels, security caption).
- **Data source:** the home RSC computes the three stats. Tours count and
  destinations count come from existing public list endpoints' pagination
  totals; the review **aggregate (avg + count)** source is **to be confirmed in
  the plan** — reuse an existing public endpoint if one exposes it, else add a
  small public aggregate. Stats are passed to `TrustBand` as props (component
  stays presentational + testable).

## Scope

- **In:** home `/` — swap `TechCloud` → `TrustBand`; self-host payment logos;
  i18n copy; live stat wiring; retire `TechCloud`.
- **About page (decided):** give About the **same `TrustBand`** for
  site-wide consistency; retire `BuiltWith` + `TechMarquee`.
- **Out:** no new payment methods; no checkout/booking changes; no fabricated
  logos or numbers.

## Accessibility & performance

- Marquee already respects `prefers-reduced-motion` (no motion) and pauses on
  hover. Payment logos: a visible "We accept …"/caption provides the text;
  individual marks are `aria-hidden` decorative or carry `alt`.
- Dark band + text/logo inks must meet WCAG 2.2 AA contrast.
- Self-hosted SVGs → no external CDN, no layout shift.

## Testing

- **TDD (pure logic):** stat formatting helpers — rating rounded to 1 dp with a
  trailing star, count/number formatting, and the stats-assembly mapper.
- **Visual/layout:** manual + existing e2e conventions.

## Open questions (resolve in plan)

1. Review-aggregate data source: reuse an existing public endpoint that exposes
   avg-rating + count, or add a small public aggregate. (Tours/destinations
   counts come from existing list-endpoint pagination totals.)

_Resolved during spec review (2026-07-10): **3 stats** (drop the 26-review count);
About page **gets the same `TrustBand`**._
