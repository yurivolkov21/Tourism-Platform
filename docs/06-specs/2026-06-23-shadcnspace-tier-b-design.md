# Design spec — Shadcn Space adoption increment-3 (Tier B)

> Status: draft for review · Branch: `feat/shadcnspace-tier-b` · Date: 2026-06-23
> Follows increment-2 ([2026-06-23-shadcnspace-adoption-p3-design.md](2026-06-23-shadcnspace-adoption-p3-design.md)).
> Same rules: free + Base-UI-native items, normalized to **Emerald Heritage** tokens, reduced-motion,
> reuse `@tourism/ui` first, no fabricated content, `pnpm check:no-hex` clean, EN-only (ADR-0005).

## Goal & scope

Adopt **two Tier-B items** (need palette rebrand) into existing surfaces, the honest way:

- **`gallery-01` ("Destination Gallery")** → add an **`editorial` layout variant** to our existing
  `marketing/gallery.tsx` (which already has a **lightbox** + data-ready placeholders), then drop one
  editorial Gallery section onto the **Destinations overview** page.
- **`shine-border-02`** → extract just its **CSS shine sweep** into a `ShineBorder` wrapper in
  `@tourism/ui`, **rebranded to emerald/brass tokens with reduced intensity**, and apply it to **one**
  element only — the tour-detail **BookingBox** card — as a tasteful CTA highlight.

### Locked decisions

- **Keep our `Gallery`** (lightbox + `GallerySection`/`GalleryImage` data shape). gallery-01 is just a
  composition → it becomes a `variant="editorial"` of our component, **not** a new block. No lightbox lost.
- **shine-border goes on BookingBox only**, NOT on FeaturedPackages cards (the BorderGlow lesson — a
  per-card border made the grid worse). One premium element, easy to drop if it reads off-brand.
- Both items verified **FREE** (`/r/gallery-01.json`, `/r/shine-border-02.json`).
- One branch `feat/shadcnspace-tier-b`, **one commit per component**.
- Rebrand every hardcoded palette colour → tokens: gallery-01 `gray-950 / white / black-30` →
  `--overlay` / `--primary-foreground`; shine-border-02 `blue-500 / red-500 / teal-400` →
  `--primary` / `--chart-2` (brass) / `--chart-3` (teal). No raw hex/palette in our code.

## Per-component design

### 1. Gallery — `editorial` variant (augment existing)

- Add `variant?: 'grid' | 'editorial'` to `Gallery` (default `'grid'` = today's behaviour, untouched).
- **editorial** = asymmetric: one **lead** tile (large, `lg:col-span-2 lg:row-span-2`) + the remaining
  tiles stacked in the side column — gradient overlay (token) + hover `scale-105`, **every tile still
  opens the lightbox** (reuse the existing `running`-index + `Lightbox`). Mobile → single-column stack.
- Reuse `GallerySection`/`GalleryImage`; the lead = first image, rest = remainder. Placeholder tiles
  (no `src`) keep rendering the token gradient block (already supported by `Tile`).
- **Destinations overview** (`app/destinations/page.tsx`): insert one
  `<Gallery variant="editorial" heading subtitle />` section (placeholder images until media is wired),
  placed after `PopularTours` / before `Testimonials`. Copy from `messages.gallery` (reuse) or a new
  `messages.destinationsPage.gallery*` key if a distinct heading reads better.

### 2. ShineBorder primitive + BookingBox highlight

- New `libs/web/ui/src/components/ui/shine-border.tsx` (ported from `@shadcn-space/shine-border-02`,
  MIT): a wrapper that paints an animated **emerald** border sweep via CSS `@keyframes` + masked
  gradient — **no motion library** (it's pure CSS). Props: `className`, `disabled?`, plus token-driven
  colour/speed with **lower opacity + slower sweep** than the source (light-luxury, not laser-SaaS).
  Export from `@tourism/ui` barrel.
- **Reduced-motion:** the sweep is CSS — guard with `motion-reduce:animate-none` (Tailwind) so it
  freezes to a subtle static border; no JS needed.
- **Apply to BookingBox** (`components/tours/booking-box.tsx`): wrap the sticky `<Card>` in
  `<ShineBorder>` (or render the Card as the ShineBorder surface) so the booking aside gets a gentle
  highlight drawing the eye to the "Request to book" CTA. Single element only.

## In scope / out of scope

**In:** the two above; `Gallery` `editorial` variant; new `ShineBorder` in `@tourism/ui`; one
overview gallery section; BookingBox wrap; any minimal EN copy.

**Out:** shine-border on FeaturedPackages (rejected); other Tier-B/Pro items; real media wiring
(placeholders stay); changing the default `Gallery` `grid` behaviour or the region-page galleries.

## i18n (EN-only, ADR-0005)

No VI parity. Reuse `messages.gallery.heading/subtitle`, or add `messages.destinationsPage.gallery`
(heading+subtitle) if the overview wants its own framing. ShineBorder is decorative (no copy).

## Testing

- **Pure logic (TDD, if any):** an editorial split is trivial (`first` + `slice(1)`) — only extract +
  test a helper if the distribution grows rules; otherwise inline (no contrived test).
- **Visual / gate:** `lint test build` green; `check:no-hex` clean (token-only rebrand verified);
  editorial gallery **0 overflow @375 / @1440** (collapses to single column on mobile); BookingBox
  shine respects `motion-reduce`.

## Planned files

- `apps/web/src/components/marketing/gallery.tsx` (edit — add `editorial` variant).
- `apps/web/src/app/destinations/page.tsx` (edit — add editorial gallery section).
- `libs/web/ui/src/components/ui/shine-border.tsx` (new) + export in `libs/web/ui/src/index.ts`.
- `apps/web/src/components/tours/booking-box.tsx` (edit — wrap Card).
- Maybe `libs/shared/i18n/src/lib/messages.ts` (overview gallery heading).

## Risks / mitigations

- **Shine reads off-brand (techy/laser)** on a light-luxury heritage site → ported at **reduced
  intensity + slower + emerald tokens**, on **one** element; if it still clashes on review, drop the
  `<ShineBorder>` wrap (BookingBox falls back to the plain Card — zero collateral).
- **Overview already image-heavy** (RegionGroups + PopularTours) → the editorial gallery is a *distinct*
  asymmetric treatment; placement is one line and easily moved/removed if it feels redundant.
- **Mobile overflow** on the asymmetric grid → editorial collapses to a single column below `lg`.
- **No-hex regression** from ported palette → rebrand to tokens during the port; gate re-checks.
