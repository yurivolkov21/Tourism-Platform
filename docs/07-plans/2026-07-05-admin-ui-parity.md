# Admin UI parity implementation plan

**Goal:** the last two off-pattern admin surfaces (`/outbox` table, Dashboard
recent-bookings widget) join the shared table stack; P4 "UI polish" closes.

**Spec:** `docs/06-specs/2026-07-05-admin-ui-parity-design.md` (user-approved
2026-07-05 — Retry stays inline, no outbox search).

**Branch:** `feat/admin-ui-parity` (already cut from `main`).

## Global constraints

- Admin-only; zero BE/schema/regen. Baselines: admin **146** · api 314 · web 182.
- TDD on the one pure helper; visual work verified by gate + deploy review.
- Never reformat unnamed lines; straight quotes; Conventional Commits.
- Gate: `pnpm nx run-many -t lint test build -p @tourism/admin`, then
  `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.
- ⛔ STOP after gate for user source review → rebase + `--ff-only` merge.

## Reused seams

`AdminTableShell` (+ `columnDef.meta.align`) · `ColumnsMenu` (+ `lib/table.hideableColumns`)
· `ClientTablePagination` · `ServerTablePagination` (already in outbox) ·
`posts-table.tsx` = reference client-table column defs · outbox retry logic + toast
(move verbatim) · `Empty*` components · dashboard `Tabs` markup (keep).

## Tasks (dependency order)

### Task 1 — `formatShortDate` helper (TDD)

- [ ] Failing `apps/admin/src/lib/format-date.spec.ts`: valid ISO → `5 Jul 2026`
  (en-GB short) · null/undefined → `—` · garbage string → `—`.
- [ ] Implement `lib/format-date.ts`; swap the three locals
  (`outbox-view` · `media/garbage-view` · `subscribers/subscribers-view`) to import it
  (delete each local `formatDate`, zero other changes in those files).
- [ ] **Accept:** `pnpm nx test @tourism/admin --testPathPatterns="format-date"` green +
  full admin tests green (147+). Commit `refactor(admin): shared formatShortDate helper`.

### Task 2 — `/outbox` reskin

- [ ] Rebuild `outbox-view.tsx` per spec §2 (TanStack columns → `AdminTableShell`,
  `ColumnsMenu` in the toolbar row, Retry inline in a right-aligned non-hideable
  column, in-flight `ReadonlySet` + toast + empty state + `ServerTablePagination`
  preserved; `page.tsx` untouched).
- [ ] **Accept:** `pnpm nx run-many -t lint build -p @tourism/admin` green; behavior
  parity check via code-read (retry only on FAILED, spinner per row).
  Commit `feat(admin): outbox table on the shared admin table stack`.

### Task 3 — Dashboard widget refactor

- [ ] Refactor `dashboard/data-table.tsx` per spec §3: keep `rows` prop + `Tabs` +
  density + pageSize 10; swap table markup → `AdminTableShell`, footer →
  `ClientTablePagination`, columns dropdown → `ColumnsMenu`.
- [ ] **Accept:** `pnpm nx run-many -t lint test build -p @tourism/admin` green;
  diff shows net line reduction, no prop/route changes.
  Commit `refactor(admin): dashboard table on shared shell + pagination`.

### Task 4 — gate + ⛔ review + merge + docs

- [ ] Full affected gate vs main.
- [ ] **⛔ STOP — user source review** (+ visual check on the Vercel preview after
  merge). On approval: rebase + `git merge --ff-only` → push → delete branch.
- [ ] Docs: this plan's STATUS · spec note if deviations · roadmap P4 row + CLAUDE.md
  admin row (drop "Remaining: UI polish" — P4 complete) · HANDOFF next-action line.

**Sequencing:** 1 → 2 → 3 → 4 (2 and 3 are independent but small — serial keeps
commits clean).

## STATUS

- [ ] Tasks 1–4 — pending (branch cut 2026-07-05).
