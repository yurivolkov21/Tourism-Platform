# Admin wave D2 — implementation plan

**Spec:** `docs/06-specs/2026-07-12-admin-wave-d2-design.md`
**Branch:** `feat/admin-wave-d2` · **Scope:** `apps/admin` + `apps/api` (no migration)

**STATUS: ✅ COMPLETE** — merged to `main` 2026-07-12 (`f131b30`, ff-only). No
migration. Gate green: api **439** · admin **260** (web 232 · mobile 153 ·
core 42 unchanged). Adversarial review: 0 block-merge; all 5 should-fix + 1
nit fixed pre-merge (deleteUser role-conditional delete · AOV dominant-paid
divisor · DateRangeControl mounted-gate hydration fix · daily-window `now`
anchor for future `to` · per-currency React keys · FE inverted-pair drop);
4 nits recorded as accepted residuals in the spec.

Standing rules: TDD-first on services + pure helpers · straight quotes · no
unrelated-line reformatting · tokens only · reuse the crud stack · `noValidate`
forms · kill orphan node before nx runs · adversarial review before merge
(locking-CTE + aggregation) · Conventional Commits, no AI attribution.

## Tasks

### T1 — Admin: shared `TabPills` + migration (TDD)

- [x] `components/crud/tab-pills.spec.tsx` first: button variant (aria-selected,
      onValueChange, badge only when `count` defined) · Link variant (hrefs,
      no cursor-pointer) · ariaLabel passthrough.
- [x] `components/crud/tab-pills.tsx` (RSC-safe, byte-compatible classes).
- [x] Migrate 13 tablists: bookings-filters · reviews-view · enquiries-view ·
      users-filters · tours/destinations/categories/posts tables ·
      departures-table (time + status) · media page + outbox page (`hrefFor`).
      post-form Write|Preview stays. Existing view specs stay green.

### T2 — API: last-admin claim (TDD)

- [x] `admin-users.service.spec.ts` first: demote issues the `$queryRaw` claim;
      `[]` → 409 `ROLE_LAST_ADMIN`; success re-fetches for the DTO; promote/
      same-role keep `user.update`; self/env-admin pre-checks unchanged.
- [x] Implement the locking-CTE claim in `changeRole` (spec ③ SQL verbatim,
      enum casts checked against the DB type name).

### T3 — API: stats range + per-currency (TDD)

- [x] `admin-stats.service.spec.ts` first: no-arg call byte-identical output ·
      from/to UTC bounds on every ranged query · `from > to` → 400
      `STATS_RANGE_INVALID` · dominant-currency pick (count > total > A-Z) ·
      `revenueByCurrency` · mixed-currency top-tours sort/slice(5) · trend
      reduce (bookings=all, revenue=dominant) · dailyTrend 90d clamp.
- [x] Implement: `DashboardStatsQueryDto` (`YYYY-MM-DD` matches + real-date) ·
      ranged where clauses · groupBy `['tourId','currency']` · trend SQL →
      `Prisma.sql` with bounds + currency bucket · JS reducers ·
      `AdminStatsResponseDto` additions (`revenueByCurrency`, top-tour
      `currency`). Controller `@Query()` wiring.

### T4 — Regen typed client

- [x] Serve API → `pnpm nx run @tourism/core:api-types` → kill node.

### T5 — Admin FE: dashboard range + currency render

- [x] `lib/dashboard/date-range.spec.ts` first: `parseDateParam` (strict, real
      dates) · `presetRange` (7d/30d/90d/This month, month edges) ·
      `matchPreset` round-trip. Then `lib/dashboard/date-range.ts`.
- [x] `components/dashboard/date-range-control.tsx`: preset `TabPills` +
      Custom `Popover`+`Calendar mode="range"` + Apply → `?from&to`
      (bookings-filters URL pattern, page reset n/a).
- [x] `page.tsx` parses params → `getDashboardStats(from, to)`;
      `lib/dashboard/stats.ts` query append + new optional fields w/ defaults.
- [x] `top-tours-card` per-row currency · KPI card footnote for extra
      currencies (`formatMoney`).

### T6 — Gate + adversarial review + merge

- [x] Kill orphan node → `pnpm nx affected -t lint typecheck test build
      --base=main` green.
- [x] **Adversarial review** (strong tier): locking-CTE claim semantics under
      concurrency + pooler · stats aggregation/reduce correctness · TabPills
      byte-parity + a11y · URL/date edge cases. Fix confirmed findings.
- [x] Report → user confirms → commit → ff-merge to `main` → push → delete
      branch. (No live migration this wave.)
- [x] Docs sweep (rule 9): this STATUS · roadmap · CLAUDE.md table/test counts ·
      HANDOFF · `functions-admin.md` (stats query params + DTO additions) ·
      `frontend.md`/`backend.md` rows.
