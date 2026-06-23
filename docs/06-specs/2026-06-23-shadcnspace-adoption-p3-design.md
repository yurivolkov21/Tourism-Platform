# Design spec — Shadcn Space adoption into P3 web (increment 1: Tier A)

> Status: draft for review · Branch: `feat/shadcnspace-adoption-p3` · Date: 2026-06-23
> Related: [`@shadcn-space` registry wired in `libs/web/ui/components.json`], normalize recipe
> (React Bits / Magic UI rebrand), P3 web pages already shipped (home, about, faq, blog-teaser).

## Goal & scope

Bring a **curated, free, Base-UI-native** set of Shadcn Space items into the **existing** P3 web
pages — normalized to the **Emerald Heritage** token system, reduced-motion safe, reusing
`@tourism/ui` first — to upgrade **specific** spots **without diluting** the custom Lily-clone
identity. This increment = **Tier A (token-clean)** only.

**Decided up front (locked):**
- **Scope = 6 Tier-A items:** `number-ticker-01`, `feature-01`, `timeline-01`, `team-01`,
  `faq-01`, `blog-01`.
- **Per-component verdict** (replace / augment / borrow-pattern-only) is decided in this spec
  with rationale — NOT a blanket rip-and-replace.
- **One branch** `feat/shadcnspace-adoption-p3`, **one commit per component**.
- **No fabricated content.** Anything implying social proof we don't have (e.g. `feature-01`'s
  testimonial-quote half) is dropped — consistent with the earlier rejection of fake trust
  signals.
- **i18n = EN-only** (ADR-0005). Copy stays in `@tourism/i18n`; no VI parity. These items are
  largely visual, so net-new copy is minimal.
- **Free/Pro:** every item below was verified FREE by inspecting its `/r/<slug>.json`. Ecommerce
  + some variants are Pro (out of scope).

### Key realisation from reading the current code

Several of our custom components are **already the honest, better version** of the Shadcn Space
block. So for those, the correct decision is **borrow the motion/micro-interaction only** (using
our existing `Reveal` / `AnimatedContent` gsap seam) rather than install + swap. This keeps the
bundle lean and the identity intact. Only items with genuine net-new value get installed.

## Per-component design & verdict

| # | Item | Target (existing) | Verdict | Why |
| - | ---- | ----------------- | ------- | --- |
| 1 | `number-ticker-01` | `about/by-the-numbers.tsx` + `marketing/trust.tsx` | **INSTALL + normalize → `@tourism/ui` `NumberTicker`** | Genuine new primitive (count-up). Animates **real** numbers on scroll-in. No equivalent in lib. |
| 2 | `blog-01` | `marketing/blog-teaser.tsx` | **ADOPT layout (re-implement in our tokens)** | Featured-first grid (lead card spans 2 cols) adds editorial hierarchy over our uniform 3-up. Token-clean. |
| 3 | `timeline-01` | `about/story.tsx` | **BORROW technique (no install)** | Our story already has the emerald-spine + haloed year nodes (identity). Borrow only the **scroll-driven spine-fill** motion, built with our gsap. |
| 4 | `feature-01` | `marketing/why-choose.tsx` | **BORROW motion only (no install)** | WhyChoose is already photo-left + 2×2 honest pillars ("no fabricated awards"). `feature-01` adds a **fake testimonial** half → rejected. Borrow only staggered card reveal. |
| 5 | `team-01` | `about/team.tsx` | **BORROW micro-interaction (no install)** | Our team cards are baseline-aligned + good. Borrow grayscale→colour hover + staggered reveal. Low priority. |
| 6 | `faq-01` | `app/faq/page.tsx` | **KEEP ours, borrow motion (no install)** | Ours is richer (search + grouped accordion + sticky TOC + FAQPage JSON-LD). Borrow only the staggered accordion entrance. |

**Net installs this increment:** exactly **one** new shared component (`NumberTicker`). Items
2–6 reuse existing seams (`Reveal`/`AnimatedContent`, tokens). This is intentional and honest.

### 1. NumberTicker (install + normalize)

- Install: `pnpm dlx shadcn add @shadcn-space/number-ticker-01 -c libs/web/ui` (FREE; 0 deps,
  pure `requestAnimationFrame`, token-only — confirmed in `/r/number-ticker-01.json`).
- Normalize per recipe: imports → relative, `'use client'`, export from `libs/web/ui/src/index.ts`,
  rename to `NumberTicker`, keep token classes only.
- **Reduced-motion:** render the final value immediately (no count) when
  `prefers-reduced-motion: reduce` — reuse `apps/web/src/hooks/use-reduced-motion.ts`.
- **Trigger on view:** start the count when the element scrolls into view (IntersectionObserver),
  not on mount — so off-screen numbers aren't "already done".
- **Data shape problem:** current values are display **strings** (`"12,000+"`, `"150+"`,
  `"$2M"`). To count up we need `{ value:number, suffix:string, prefix?:string, decimals?:number }`.
  → add a **pure parse helper** `parseMetric(str)` (TDD'd) rather than restructuring `@tourism/i18n`.
- Apply to: `ByTheNumbers` (`dt` value) and the `Trust` stats strip. Honest (real figures).

### 2. BlogTeaser featured-first layout

- Re-implement `blog-01`'s composition in our tokens/markup (do **not** import — our `BlogTeaser`
  already owns fixtures + i18n + the API-wire TODO). Lead post spans 2 cols on `sm+`; remaining
  posts in the side column. Keep `PostTeaser` fixtures, `messages.blog`, hover/`Reveal`.
- Full `/blog` + `/blog/[slug]` stays **P6** (unchanged here).

### 3. About story — scroll-driven spine fill

- Augment `about/story.tsx`: the existing emerald-gradient centre spine gets a **scroll-progress
  fill** (a foreground overlay scaling/clipping with scroll), reduced-motion → static full spine.
- Reuse gsap (already a dep). No new component.

### 4–6. Motion-only borrows

- `why-choose.tsx`, `team.tsx`, faq accordion: wrap items in our `Reveal` with a small per-index
  **stagger** (delay = index × 60–80 ms). `team`: add `grayscale group-hover:grayscale-0`
  transition. All reduced-motion safe via `AnimatedContent`'s existing guard. **No installs.**

## In scope / out of scope

**In:** the 6 verdicts above; one new `NumberTicker` in `@tourism/ui`; the `parseMetric` helper +
tests; token-only styling; reduced-motion on every motion; EN copy in `@tourism/i18n` if any.

**Out:** Tier B (`gallery-01`, `shine-border-02`) — next increment. Any Pro item (ecommerce,
`testimonial-03`, `shine-border-01`). Real-data wiring / booking. `/blog` pages (P6). Replacing
WhyChoose/FAQ/Team/Story structure. New fabricated content.

## i18n (EN-only, ADR-0005)

- No VI parity (single-language product). New keys (if any): a `messages.blog.featuredLabel`
  ("Featured") for the lead card; everything else reuses existing keys. NumberTicker is numeric.

## Testing

- **Unit (TDD):** `parseMetric` — pure: `"12,000+" → {value:12000,suffix:"+"}`, `"$2M" →
  {prefix:"$",value:2,suffix:"M"}`, `"4.9" → {value:4.9,decimals:1}`, plain `"24/7"` → passthrough
  (no count). Target ≥80% on the helper.
- **Visual / e2e (Playwright):** home + about render; NumberTicker shows final value with JS off
  / under reduced-motion (no zeros stuck); BlogTeaser featured layout @375/@1440 no overflow.
- **Gate:** `lint typecheck test build` green; `pnpm check:no-hex` clean (token-only).

## Planned files

- `libs/web/ui/src/components/ui/number-ticker.tsx` (new, normalized) + export in `index.ts`.
- `apps/web/src/lib/parse-metric.ts` (new, pure) + `parse-metric.spec.ts` (new).
- Edit: `about/by-the-numbers.tsx`, `marketing/trust.tsx`, `marketing/blog-teaser.tsx`,
  `about/story.tsx`, `marketing/why-choose.tsx`, `about/team.tsx`, `app/faq/page.tsx`.
- Maybe: `messages.blog.featuredLabel` in `@tourism/i18n`.

## Risks / mitigations

- **NumberTicker stuck at 0 without JS / under reduced-motion** → render final value as the
  initial DOM text; JS only animates upward. (SEO/no-JS safe, same pattern as `AnimatedContent`.)
- **`parseMetric` mis-parsing odd values** (`"24/7"`, ranges) → passthrough rule + tests.
- **Scope creep into replace** → spec locks augment/borrow verdicts; deviations need a spec edit.
- **Motion overload** (we already added Reveal/glare) → keep staggers subtle; respect perf budget
  + reduced-motion; no new animation library (gsap/motion already vendored).
