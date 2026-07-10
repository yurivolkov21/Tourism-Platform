# Admin motion layer — implementation plan

**Spec:** [`docs/06-specs/2026-07-10-admin-motion-layer-design.md`](../06-specs/2026-07-10-admin-motion-layer-design.md)
**Branch:** `feat/admin-motion-layer`

## STATUS

- **State:** ✅ COMPLETE — merged to `main` 2026-07-10 (`6836500`, ff-only)
- **Done:** Tasks 1–6 + gate (admin 164 tests: +3 primitives, +3 skeletons, +2 ticker transforms)
- **Next action:** user visual pass on the deployed admin (cold-API skeletons · KPI count-up · route fade · sidebar pill · reduced-motion)

## Tasks

### Task 1 — deps + motion primitives

- [x] Add `motion` to `apps/admin/package.json` dependencies (version matching
      `libs/web/ui/package.json`, `^12.40.0`); `pnpm install`.
- [x] `apps/admin/src/components/motion/reveal.tsx` — `Reveal` (wraps
      `AnimatedContent` from `@tourism/ui`: `distance={12}` `duration={0.35}`
      `threshold={0.1}`, passes `delay`/`className`/`children`).
- [x] `apps/admin/src/components/motion/stagger.tsx` — `Stagger` (children array →
      `Reveal delay={i * 0.06}`; single wrapper element with `className`).
- [x] RTL render tests for both (children render, className lands).

### Task 2 — skeleton components

- [x] `apps/admin/src/components/motion/table-skeleton.tsx` — mirrors
      `admin-table-shell` (list-header strip + column header + 8 rows of `Skeleton`
      cells; `rows`/`cols` props with defaults).
- [x] `apps/admin/src/components/motion/dashboard-skeleton.tsx` — mirrors the
      dashboard page grid (4 KPI cards, chart block, 3-widget grid, table block).
- [x] RTL render tests (row/col counts).

### Task 3 — loading.tsx routes

- [x] `(admin)/loading.tsx` → `DashboardSkeleton`.
- [x] `loading.tsx` → `TableSkeleton` in: tours, bookings, destinations, categories,
      posts, enquiries, reviews, subscribers, cancellation-requests, media, users,
      outbox. (Detail/edit pages stream fast off the list cache — skipped, YAGNI.)

### Task 4 — dashboard motion

- [x] `SectionCards`: values through `NumberTicker` (map each card's formatted value →
      prefix/suffix/decimals; verify `computeCardModels` output shape first).
- [x] Wrap KPI cards in `Stagger`; chart + widget grid (`BookingsPipeline`,
      `TopToursCard`, `NeedsAttention`) + recent-bookings table in `Reveal` with small
      delays. Dashboard page stays a Server Component — wrappers are client leaves.

### Task 5 — shell motion

- [x] `apps/admin/src/app/(admin)/template.tsx` — 150 ms fade + 4 px rise
      (`motion.div`, `useReducedMotion` → static). NOTE: template remounts per
      navigation (accepted; filters are URL state).
- [x] `nav-main.tsx` — active-item pill via `motion.span layoutId="nav-active"`
      (reduced-motion → no layout animation).

### Task 6 — CRUD shared stack

- [x] `list-header.tsx` + `admin-table-shell.tsx`: single `Reveal` wrappers
      (enter-only). Forms deliberately untouched (spec: data-entry surfaces stay
      static).

### Task 7 — gate + docs

- [x] Kill orphan node → `pnpm nx affected -t lint typecheck test build` green.
- [x] Report to user → confirm → commit → rebase ff-only merge to `main`.
- [x] Docs sweep: this STATUS block · CLAUDE.md admin row (+test count) ·
      HANDOFF.md current-state.
