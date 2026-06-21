# Plan — P2 Design Token System implementation

**Spec:** [2026-06-21-p2-design-tokens-system-design.md](../specs/2026-06-21-p2-design-tokens-system-design.md)
**Approach:** A (framework first, neutral values) · **Generator:** Style Dictionary · **Branch:** `feat/p2-design-tokens` (when execution starts)

Execute task-by-task; verify after each; stop and report on divergence. No brand "taste" decisions
here — neutral defaults + one provisional primary/font, swappable later.

## Guiding constraint (the load-bearing risk)

shadcn (Base UI) components already consume a **fixed set of CSS variable names** (`--background`,
`--foreground`, `--primary(-foreground)`, `--secondary*`, `--muted*`, `--accent*`, `--destructive`,
`--border`, `--input`, `--ring`, `--radius`, `--chart-1..5`, `--sidebar*`) plus the Tailwind v4
`@theme inline` mapping (`--color-* → var(--*)`). The generated output **must reproduce these exact
names** (in `:root` + `.dark`) and the `@theme` mapping, or every component breaks. → The generator's
first job is to *reproduce today's `global.css` token block from `@tourism/tokens`*, byte-compatible
in variable names, before we extend anything.

## Task 1 — Stand up `@tourism/tokens` + Style Dictionary

1. Add Style Dictionary as a dev dependency of `libs/shared/tokens`.
2. Source layout:

   ```text
   libs/shared/tokens/src/
     primitives/   color, space, type, radius, border, shadow, motion, breakpoint, zindex, opacity, size
     semantic/     color, radius, shadow, ... (role → primitive refs)
     index.ts      (typed exports for programmatic/RN use)
   ```

3. SD config (`style-dictionary.config.*`) with custom transforms/formats:
   - Web: emit `:root` + `.dark` custom props (keep `oklch`) **and** the `@theme inline` block.
   - RN (stub): emit `theme.ts` (numbers in dp, hex/rgba colors).
4. Wire an **Nx target** (`build`/`tokens`) that regenerates outputs; outputs land in a `generated/`
   dir, git-ignored or clearly marked "do not edit".
5. Add package `exports`: `./tokens.css` (generated web output), `.` (TS tokens).
6. **Verify:** `pnpm nx run @tourism/tokens:<target>` produces `tokens.css` + `theme.ts`.

## Task 2 — Reproduce the current theme (parity migration)

1. Encode today's neutral palette + radius (the values currently in `apps/*/global.css`) as
   primitive + semantic tokens.
2. Generate `tokens.css` and **diff its variable set against the current `global.css` token block** —
   names + `@theme` mapping must match (values may be authored, not hand-copied).
3. **Verify:** generated var names ⊇ everything shadcn references (grep components for `var(--…)` /
   Tailwind color utilities).

## Task 3 — Switch web + admin to the generated tokens

1. In each app's `global.css`, replace the inline `@theme`/`:root`/`.dark` block with
   `@import '@tourism/tokens/tokens.css';` (keep `@import 'tailwindcss'`, `tw-animate-css`,
   `shadcn/tailwind.css`, `@source`, and `@layer base`).
2. Add `@tourism/tokens` as a `workspace:*` dependency where needed; run `nx sync`.
3. **Verify:** `/ui-check` renders identically (build + visual check); no missing-variable regressions.

## Task 4 — Extend to the full system (neutral values)

Add the still-missing groups from spec §2 (author primitives + semantic, regenerate):

1. **Typography:** family (`sans`=Geist, provisional `heading`, `mono`), size scale + line-height +
   letter-spacing + weight, composite text styles.
2. **Spacing/layout:** spacing scale, `container.max`, `gutter`, `space.section`, grid.
3. **Elevation** (intent scale + dark-mode rule), **motion** (duration/easing + reduced-motion).
4. **Breakpoints**, **z-index**, **opacity/states**, **sizing** (control heights, icon, avatar),
   **iconography** (Lucide size/stroke), **density** (comfortable/compact).
5. New surfaces: overlay/scrim, a11y (focus-ring + 44px target), loading/skeleton, prose/reading
   width, gradient/image-scrim, selection/scrollbar/caret.
6. **One provisional brand choice:** pick a placeholder `primary` (non-gray, e.g. a travel-friendly
   blue/teal) + confirm heading font — flagged clearly as swappable (real "gu" in design-direction).
7. **Verify:** Tailwind exposes the new tokens as utilities; sample usages compile.

## Task 5 — Tourism semantics + guardrails

1. Tourism tokens (spec §4): price/price-compare, rating, badges (map BE `TourBadge`), departure
   status, media aspect ratios.
2. Guardrail: a lint/Stylelint rule (or review checklist) blocking raw hex/px in `@tourism/ui`.
3. Note (not implement) the formatting-convention dependency on `@tourism/i18n` (spec §4.1).
4. **Verify:** guardrail flags a deliberately-planted hex.

## Task 6 — RN export stub + gate

1. Validate `theme.ts` shape is consumable by an RN theme (even though mobile isn't built) — a tiny
   type-level/import smoke is enough.
2. Run the gate: `pnpm nx run-many -t lint typecheck test build` (affected) + workspace `typecheck lint`.
3. Update spec acceptance checkboxes; summarize for review before merge.

## Phasing / PR strategy

- Tasks 1–3 = **PR 1** (foundation + parity migration; zero visual change — safest).
- Task 4 = **PR 2** (full neutral system).
- Tasks 5–6 = **PR 3** (tourism semantics, guardrails, RN stub).
- Each PR: branch → gate → review → rebase-merge.

## Out of scope

- Final brand palette / visual direction (design-direction step).
- Real product pages; mobile app implementation (only the RN export contract).
