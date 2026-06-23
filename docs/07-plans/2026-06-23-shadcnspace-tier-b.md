# Implementation plan — Shadcn Space Tier B (increment-3)

> Spec: [`2026-06-23-shadcnspace-tier-b-design.md`](../06-specs/2026-06-23-shadcnspace-tier-b-design.md)
> Branch: `feat/shadcnspace-tier-b` · one commit per component.

## Reused seams (touch, don't rebuild)

- `apps/web/src/components/marketing/gallery.tsx` — `Gallery` + `Tile` + `Lightbox` wiring (add a variant).
- `apps/web/src/components/marketing/lightbox.tsx` — reused as-is by both variants.
- `@tourism/ui` barrel (`libs/web/ui/src/index.ts`) — export `ShineBorder`.
- `@tourism/i18n` `messages.gallery` / `messages.destinationsPage` — EN copy.
- Brand tokens + `pnpm check:no-hex` — rebrand palette → `--overlay`/`--primary-foreground`/`--primary`/`--chart-2`/`--chart-3`.

## Tasks (dependency-ordered)

### T1 — `Gallery` editorial variant  ·  commit "gallery editorial"
- Add `variant?: 'grid' | 'editorial'` (default `'grid'`; existing behaviour byte-for-byte unchanged).
- editorial branch: lead tile (`lg:col-span-2 lg:row-span-2`) + remaining tiles in the side column,
  token gradient overlay + hover `scale-105`, **all tiles open the lightbox** (keep the `running` index).
  Collapse to single column `< lg`.
- **Accept:** `variant="grid"` renders identically to today; `variant="editorial"` shows the asymmetric
  layout; lightbox opens from every tile; `check:no-hex` clean; build green.

### T2 — Editorial gallery on Destinations overview  ·  commit "overview gallery"
- `app/destinations/page.tsx`: add `<Gallery variant="editorial" heading subtitle />` (placeholder
  tiles) after `PopularTours`, before `Testimonials`. Add `messages.destinationsPage.gallery{Heading,
  Subtitle}` if a distinct heading reads better, else reuse `messages.gallery`.
- **Accept:** overview prerenders static; **0 overflow @375 / @1440**; section reads as a distinct moment.

### T3 — `ShineBorder` primitive → `@tourism/ui`  ·  commit pt.1 of shine
- Port `@shadcn-space/shine-border-02`'s CSS sweep into `libs/web/ui/src/components/ui/shine-border.tsx`:
  `@keyframes` + masked gradient, **emerald/brass/teal tokens**, **lower opacity + slower** than source,
  `motion-reduce:animate-none` to freeze under reduced-motion. No motion library. Export from barrel.
- **Accept:** `@tourism/ui` typecheck/build green; `check:no-hex` clean; importing `{ ShineBorder }` works;
  renders an animated emerald border around arbitrary children, static under `prefers-reduced-motion`.

### T4 — Apply ShineBorder to BookingBox  ·  commit pt.2 (closes "shine")
- `components/tours/booking-box.tsx`: wrap the sticky `<Card>` in `<ShineBorder>` (keep the sticky
  positioning on the outer element). Single element only — no other surface gets it.
- **Accept:** tour-detail builds static; the booking aside shows a subtle emerald shine; reduced-motion
  freezes it; the Card/CTA layout is unchanged otherwise.

### T5 — Gate + responsive audit, stop for review  ·  commit (docs/fixups)
- `lint test build` green; `check:no-hex` clean; responsive @375/@1440 (editorial gallery, BookingBox);
  record any execution-note deviations in the spec.
- **Accept:** gate green; 0 overflow; then **STOP for review** before merge.

## Sequencing

T1 → T2 (T2 needs the variant) · T3 → T4 (T4 needs the primitive). T1/T2 and T3/T4 are independent
tracks; do gallery track then shine track. T5 last.

## Out of scope (this increment)

shine-border on FeaturedPackages; other Tier-B / Pro items; real media wiring; region-page gallery
changes; default `grid` variant behaviour.
