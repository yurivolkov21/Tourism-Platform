# Spec — P2 UI Foundation: shadcn (Base UI) in `@tourism/ui`

**Date:** 2026-06-20 · **Phase:** P2 (design system) · **Branch:** `feat/p2-ui-foundation`

## Goal

Stand up a **shared web component library** in `@tourism/ui` (`libs/web/ui`) based on
**shadcn/ui using the Base UI base** (not Radix), consumed by both `@tourism/web` and
`@tourism/admin`. Install **all 56 registry components except `native-select`** (= **55**).

## Why this shape

- CLAUDE.md mandates the design system live in `@tourism/tokens` + `@tourism/ui`, with
  *"Reuse `@tourism/ui` first"*. Dropping shadcn into the app (`apps/web/components/ui`)
  would not be shared — so components go into the lib.
- shadcn is a **registry**, not an npm dependency: `add` copies component source into the
  repo. Base UI (`-b base`) is the chosen headless primitive layer.

## Current state (verified)

- No Tailwind anywhere (only mentioned in BLUEPRINT). Apps use Nx's default `global.css` reset.
- `@tourism/ui` is a bare Nx React lib (`src/index.ts` → `src/lib/ui.tsx`), no `components.json`,
  no `lib/utils`/`cn`.
- `@tourism/tokens` is a stub (`tokens()` → `'tokens'`). **Out of scope here** — full token
  build-out is a later P2 step. shadcn's CSS-variable theme becomes the initial token layer.
- pnpm 11.4, Next 16 (app-router, RSC), TS, import alias `@`.

## Scope

**In:**
1. Tailwind v4 (CSS-first) configured for `@tourism/ui` + a shared `globals.css` exporting the
   theme (shadcn CSS variables).
2. shadcn `components.json` in `libs/web/ui` targeting the lib, `base=base` (Base UI),
   `css-variables=true`.
3. Install 55 components (all `registry:ui` except `native-select`); re-export from the lib index.
4. `web` + `admin` consume `@tourism/ui` components and import the shared `globals.css`.
5. Quality gate green (lint, typecheck, build).

**Out (deferred):**
- Full `@tourism/tokens` design-token system (palette/typography/spacing) — later P2 step.
- Visual/brand direction, theming polish, dark mode tuning.
- Rebuilding the Nx welcome pages into real product UI.

## Risks / unknowns (resolve during execution)

- **shadcn `init` on a bare Nx lib**: init detects framework from cwd; `libs/web/ui` has no
  Next config. May need manual `components.json` + Tailwind wiring instead of relying on the
  framework-detecting init. Verify, adapt.
- **Tailwind v4 source scanning across the lib boundary**: apps must `@source` the lib's
  component dir so utility classes used in `@tourism/ui` get generated.
- **Base UI availability**: a few components may map differently than Radix under `base`.
  If any component is unavailable for the base, record it and skip (report to user).
- **Dependency footprint**: installing all 55 pulls many third-party libs (recharts, embla,
  vaul, cmdk, react-day-picker, react-hook-form+zod, input-otp, react-resizable-panels, sonner).
  Accepted by user.

## Acceptance criteria

- [x] `@tourism/ui` exports **54** components; `pnpm nx typecheck @tourism/ui` passes.
- [x] A smoke usage (`/ui-check` page using Button/Card/Badge) builds in both `web` and `admin`.
- [x] `pnpm nx run-many -t lint typecheck test build` green for ui/web/admin; workspace-wide
      `typecheck lint` green (9 projects).
- [x] Module-boundary lint (`@nx/enforce-module-boundaries`) not violated (admin scope:admin →
      ui scope:web type:ui lints clean).
- [x] Component unavailable for Base UI documented: **`form`** (Base UI uses `field`/`field-group`
      instead of the Radix react-hook-form wrapper) → **54** components, not 55.

## Outcome notes (as built)

- **Init can't run in a bare Nx lib** (no framework) and **requires Tailwind pre-installed** →
  bootstrapped via `apps/web` (Next), then authored `libs/web/ui/components.json` manually
  (`style: "base-nova"` encodes Base UI; the schema has no `base` field).
- **Nx 22 resolves via package `exports` + `customConditions`, not tsconfig paths.** Apps must
  declare `"@tourism/ui": "workspace:*"` (pnpm symlink) for Turbopack to resolve the package, and
  `nx sync` updates TS project references.
- **shadcn's `@/` alias does not resolve for lib files bundled by an app's Turbopack** → a codemod
  rewrote all 77 internal `@/…` specifiers in the lib to relative paths.
  ⚠️ **Future `shadcn add … -c libs/web/ui` re-introduces `@/` imports — re-run the same codemod**
  (rewrite `@/` → relative within `libs/web/ui/src`).
- Tailwind v4: each app `@source`s `../../../../libs/web/ui/src` so utilities used by lib
  components get generated. Theme (base-nova vars) lives per-app via `@import "shadcn/tailwind.css"`.
- **Deferred / known refinements:** ui lib is tagged `scope:web` but consumed by `admin` too
  (consider `scope:shared`); theme duplicated across apps (could centralize in the lib);
  full `@tourism/tokens` build-out still pending.
