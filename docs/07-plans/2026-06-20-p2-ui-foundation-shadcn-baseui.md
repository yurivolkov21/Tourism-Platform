# Plan — P2 UI Foundation: shadcn (Base UI) in `@tourism/ui`

**Spec:** [2026-06-20-p2-ui-foundation-shadcn-baseui.md](../06-specs/2026-06-20-p2-ui-foundation-shadcn-baseui.md)
**Branch:** `feat/p2-ui-foundation`

Execute task-by-task; verify after each. Stop and report if a step diverges from the spec.

## Task 1 — Tailwind v4 + shadcn init (Base UI) in `@tourism/ui`

1. Run `pnpm dlx shadcn@latest init -b base -c libs/web/ui` (non-interactive where possible).
2. Inspect what init produced. If it failed to detect the framework / wire Tailwind correctly
   for a bare lib, fall back to manual setup:
   - Install `tailwindcss@4` + PostCSS pieces as needed.
   - Create `libs/web/ui/src/styles/globals.css`: `@import "tailwindcss";` + shadcn theme
     (`:root`/`.dark` CSS variables) + `@source` for `./` component dir.
   - Create `libs/web/ui/components.json` (aliases → lib paths, `base=base`, `cssVariables=true`,
     empty `tailwind.config` for v4).
   - Create `lib/utils.ts` exporting `cn` (clsx + tailwind-merge).
3. **Verify:** `components.json` present, `cn` resolves, globals.css imports Tailwind.

## Task 2 — Install the 55 components

1. `pnpm dlx shadcn@latest add <list> -c libs/web/ui` with all `registry:ui` names **except
   `native-select`** (55 total). Prefer one batched call; fall back to smaller batches on error.
2. Components land under `libs/web/ui/src/components/ui/` (or wherever components.json points).
3. **Verify:** count installed files; note any component the registry could not provide for the
   Base UI base.

## Task 3 — Re-export from the lib barrel

1. Update `libs/web/ui/src/index.ts` to re-export the component modules (and `cn`).
2. Keep or remove the placeholder `src/lib/ui.tsx` (remove if unused, after checking importers).
3. **Verify:** `pnpm nx build @tourism/ui` passes; exports resolve.

## Task 4 — Wire `web` + `admin` to consume the lib

1. In each app, import the shared `@tourism/ui` globals.css from the root layout (replace/augment
   the Nx default `global.css`), and add Tailwind `@source` for the lib if required by v4.
2. Add a smoke usage (`Button`) on a page to prove end-to-end rendering + build.
3. Ensure cross-project imports respect `@nx/enforce-module-boundaries`
   (`scope:web`/`scope:admin` → `scope:web type:ui` is allowed per BLUEPRINT §3 — verify).
4. **Verify:** `pnpm nx build @tourism/web` and `@tourism/admin` pass.

## Task 5 — Gate

1. `pnpm nx run-many -t lint typecheck build` (or `affected`).
2. Fix issues; re-run until green.
3. Update spec acceptance checkboxes; summarize for user review before merge.

## Notes

- Do **not** introduce hex colors in any hand-written CSS — use the CSS-variable theme.
- This is foundation only; building real product UI and the full `@tourism/tokens` system
  are separate follow-ups.
- Confirm with user before merge (project convention).
