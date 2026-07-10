# Admin motion layer — design spec

**Date:** 2026-07-10 · **Scope:** `@tourism/admin` only · **Status:** approved direction
(user 2026-07-10: motion layer only — no dashboard content upgrade, no CRUD visual redesign).

## Goal

Give the admin the same finished feel the web app has: nothing appears with a hard pop,
data loading has skeletons instead of blank space, key numbers count up, and navigation
has a light sense of place. **Subtle enterprise motion** (Linear/Vercel dashboard feel):
100–300 ms fades/rises, never blocking interaction, always honouring
`prefers-reduced-motion`.

## Non-goals

- New dashboard widgets/data or CRUD layout redesign (explicitly deferred by the user).
- Showy effects (3D tilt, spring bounce, chart path-draw) — rejected during brainstorm.
- Touching booking/refund logic or any server action.

## Approach (approved: A + light route fade from B)

Reuse the motion stack that already ships in `@tourism/ui` (`motion` v12 lives there;
`AnimatedContent`, `NumberTicker`, `Skeleton` are exported and reduced-motion-aware).
Admin gets thin app-local wrappers (mirroring how web wraps `AnimatedContent` in its own
`Reveal`) and wires them into the **shared** surfaces so the effect spreads app-wide
without per-page bespoke work.

### Components (all in `apps/admin/src/components/motion/`)

| Unit | What it does | Depends on |
| --- | --- | --- |
| `Reveal` | Fade + 12 px rise, 0.35 s, once, `delay` prop. Built on `motion/react` `whileInView` (IntersectionObserver) rather than ui's gsap `AnimatedContent` — IO works with any scroll container and admin has no no-JS/SEO constraint (decided during Task 1) | `motion/react` |
| `Stagger` | Maps children → `Reveal` with `index * 0.06 s` delay (KPI rows, widget grids) | `Reveal` |
| `route template` | `apps/admin/src/app/(admin)/template.tsx`: 150 ms fade + 4 px rise on every route change; `useReducedMotion` → render plain | `motion/react` (new `motion` dep in `apps/admin/package.json` — already in the workspace via `@tourism/ui`) |
| Nav indicator | `nav-main.tsx`: active item gets a `motion.span` `layoutId` pill that slides between items | `motion/react` |
| `TableSkeleton` | Skeleton matching the shared `admin-table-shell` layout (header row + N rows) | `@tourism/ui` Skeleton |
| `DashboardSkeleton` | Skeleton matching the dashboard layout (4 KPI cards + chart + widget grid + table) | `@tourism/ui` Skeleton |

`template.tsx` remounts on navigation by design — acceptable: admin list filters live in
the URL (GET forms), so no client state is lost.

### Wiring

1. **Loading states (biggest win):** new `loading.tsx` per route group — dashboard
   (moved into its own `(admin)/(dashboard)/` route group so its `loading.tsx` doesn't
   leak the dashboard skeleton onto detail/edit routes; URL unchanged) and the list
   routes (tours, bookings,
   destinations, categories, posts, enquiries, reviews, subscribers,
   cancellation-requests, media, users, outbox → `TableSkeleton`). Today a cold Render
   API means a blank page.
2. **Dashboard:** `SectionCards` values render through `NumberTicker`
   (prefix/suffix/decimals already supported); KPI cards + the widget grid
   (`BookingsPipeline` / `TopToursCard` / `NeedsAttention`) + chart card wrap in
   `Stagger`/`Reveal`.
3. **Shell:** route fade template + sidebar active pill.
4. **CRUD pages:** `list-header.tsx` + `admin-table-shell.tsx` get a single `Reveal`
   each (shared stack → every list page inherits). Forms: section `FieldSet`s are left
   static (motion on every form section reads as lag when an admin is doing data entry).

### Accessibility & performance

- Every primitive honours `prefers-reduced-motion` (AnimatedContent/NumberTicker already
  do; template + nav pill use `useReducedMotion`).
- Animations are opacity/transform only (compositor-friendly), durations ≤ 350 ms,
  no animation on re-render — enter-only (`once`).
- Skeletons are static layout placeholders (`animate-pulse` from the ui `Skeleton`),
  no JS cost.

### Error handling

No behaviour changes: `ErrorAlert` fallbacks stay; skeletons only cover the Suspense
window that `loading.tsx` introduces. If stats fail, the existing error branch renders
(inside the route fade, which is harmless).

### Testing

- Pure logic here is minimal; the stagger-delay derivation lives inline (`index * 0.06`)
  — not worth extraction.
- Jest render tests for `TableSkeleton` / `DashboardSkeleton` / `Reveal`/`Stagger`
  (render children, no crash, respects `className`) following the admin RTL patterns.
- Visual verification on the deployed preview (user tests on Vercel, not locally).

## Definition of done

- Dashboard + all list routes show skeletons while streaming.
- KPI values count up once on load; dashboard sections stagger in.
- Route changes fade; sidebar active pill slides.
- `pnpm nx affected -t lint typecheck test build` green; reduced-motion verified
  (template/nav render statically when set).
