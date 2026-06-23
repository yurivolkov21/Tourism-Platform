# Implementation plan — Shadcn Space adoption P3 (increment 1: Tier A)

> Spec: [`2026-06-23-shadcnspace-adoption-p3-design.md`](../06-specs/2026-06-23-shadcnspace-adoption-p3-design.md)
> Branch: `feat/shadcnspace-adoption-p3` · one commit per component · TDD on pure logic.

## Reused seams (touch, don't rebuild)

- `apps/web/src/hooks/use-reduced-motion.ts` — gate every animation.
- `apps/web/src/components/marketing/reveal.tsx` (`Reveal` over `AnimatedContent`, gsap) — staggered entrances.
- `@tourism/ui` barrel (`libs/web/ui/src/index.ts`) — export the new `NumberTicker`.
- `@tourism/i18n` `messages.*` — all copy (EN-only).
- `libs/web/ui/components.json` `@shadcn-space` registry — install source.
- Brand tokens / `pnpm check:no-hex` — styling only via tokens.

## Tasks (dependency-ordered)

### T1 — `parseMetric` pure helper (TDD)  ·  commit pt.1 of NumberTicker
- **RED:** write `apps/web/src/lib/parse-metric.spec.ts` first:
  `"12,000+"→{value:12000,suffix:"+"}` · `"$2M"→{prefix:"$",value:2,suffix:"M"}` ·
  `"4.9"→{value:4.9,decimals:1}` · `"24/7"→{raw:"24/7",animate:false}` (passthrough).
- **GREEN:** implement `apps/web/src/lib/parse-metric.ts` (pure, typed, no deps).
- **Accept:** `pnpm nx test @tourism/web` passes new specs; ≥80% on the helper.

### T2 — Install + normalize `NumberTicker` → `@tourism/ui`  ·  commit pt.2
- `pnpm dlx shadcn add @shadcn-space/number-ticker-01 -c libs/web/ui` → normalize: relative
  imports, `'use client'`, rename `NumberTicker`, token-only, export in `index.ts`.
- Add props: `value:number`, `suffix?/prefix?/decimals?`, start **on view** (IntersectionObserver),
  and **reduced-motion → render final value immediately** (use `use-reduced-motion`).
- **Accept:** `pnpm nx build @tourism/ui` + `typecheck` green; `check:no-hex` clean; importing
  `{ NumberTicker }` from `@tourism/ui` works.

### T3 — Wire NumberTicker into stats  ·  commit pt.3 (closes "number-ticker" component)
- `about/by-the-numbers.tsx`: feed `dt` value through `parseMetric` → `<NumberTicker/>`.
- `marketing/trust.tsx`: same for the stats strip.
- **Accept:** numbers count up when scrolled into view; with JS disabled **and** under
  reduced-motion the final value is shown (no stuck `0`); `check:no-hex` clean.

### T4 — BlogTeaser featured-first layout  ·  commit
- Re-implement `blog-01` composition in `marketing/blog-teaser.tsx` (lead post spans 2 cols on
  `sm+`, rest in side column) using our tokens + existing `PostTeaser` fixtures + `messages.blog`.
  Add `messages.blog.featuredLabel` ("Featured") if a label is used. Keep API-wire TODO + `Reveal`.
- **Accept:** lead card spans 2 cols `sm+`; **0 horizontal overflow @375 and @1440**; hover intact.

### T5 — About story scroll-driven spine fill  ·  commit
- Augment `about/story.tsx`: overlay the emerald spine with a scroll-progress fill (gsap), reduced
  -motion → static full spine. Keep haloed year nodes + alternating layout.
- **Accept:** spine fills as you scroll the section; static under reduced-motion; no layout shift.

### T6 — Motion borrows: WhyChoose + Team  ·  commit
- `why-choose.tsx`: staggered `Reveal` on the 2×2 cards (delay = i×70 ms). **Do NOT** add any
  testimonial/quote (honesty). `team.tsx`: staggered reveal + `grayscale group-hover:grayscale-0`.
- **Accept:** cards enter staggered; reduced-motion → all visible, no motion; no new copy claims.

### T7 — FAQ accordion entrance  ·  commit
- `app/faq/page.tsx`: staggered `Reveal` on accordion items only. Keep search + TOC + FAQPage
  JSON-LD untouched.
- **Accept:** items stagger in on load; search/TOC/schema still work; no-hex clean.

### T8 — Gate + e2e + responsive audit  ·  commit (docs/fixups)
- `/gate` (lint + typecheck + test + build) green; Playwright: home + about + faq render,
  NumberTicker final-value under reduced-motion, BlogTeaser featured layout. Audit @375/@1440.
- **Accept:** gate green; `check:no-hex` clean; 0 overflow; then **STOP for review** before merge.

## Sequencing

T1 → T2 → T3 (NumberTicker chain, must be in order) → T4 → T5 → T6 → T7 → T8.
T4–T7 are independent of each other (any order) once T1–T3 land; keep one commit each.

## Out of scope (this increment)

Tier B (`gallery-01`, `shine-border-02`) = increment 2. Pro items, ecommerce, real-data wiring,
`/blog` pages (P6), structural replacement of WhyChoose/FAQ/Team/Story.
