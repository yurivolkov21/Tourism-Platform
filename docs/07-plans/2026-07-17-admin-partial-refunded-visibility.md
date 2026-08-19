# Admin PARTIALLY_REFUNDED visibility — implementation plan

**Spec:** [`docs/06-specs/2026-07-17-admin-partial-refunded-visibility-design.md`](../06-specs/2026-07-17-admin-partial-refunded-visibility-design.md)
**Branch:** `feat/admin-partial-refunded-visibility` · **Date:** 2026-07-17

## STATUS

- [x] T1 transforms: PIPELINE_ORDER/LABEL + spec (TDD)
- [x] T2 filters tab + URL `STATUSES` + stats type
- [x] T3 dashboard widget (BookingRowStatus, STATUS_VARIANT, mini tabs, label) + DOT_CLASS
- [x] T4 gate + review

**RESUME STATE:** all tasks done on `feat/admin-partial-refunded-visibility`;
gate GREEN (admin **268** — +2 over 266). Audit caught a 5th omission beyond
the brief: `buildBookingTimeline` gave partial-refund bookings NO refund step —
fixed with a DISTINCT step key `partially_refunded` (review caught that reusing
`'refunded'` would be relabelled "Refunded" by the detail page's
`LIFECYCLE_LABELS[step.key] ?? step.label` lookup). Review's 2nd finding also
fixed: the dashboard widget's mini tab trigger still rendered the raw
underscore (`Partially_refunded`) — same `replace(/_/g,' ')` as the cell.
Review confirmed: consistency equations hold by construction; web's own status
maps already handle partial; no exhaustive switch breaks on the widened types.
**Implementation not yet committed — awaiting user review before commit +
merge.** Verify on deploy: All=38 = Σtabs = Σpipeline = KPI; each tab's rows
match its badge.

## Sequencing

T1 (spec first — red on the missing status) → T2/T3 (independent) → T4.
Typecheck is the safety net: T1's `PipelineStatus` widening forces D
(`DOT_CLASS`); `BookingRowStatus` widening forces the widget variant map.

## Reused seams

- `statusCounts` (API `countByStatus`) + `bookingsByStatus` (admin-stats) —
  both already carry all 5 statuses; UI-only work.
- `STATUS_META` in `lib/bookings/format.ts` — the canonical partial
  label/variant (already tested); widget variant mirrors it.
- `TabPills` shared component — tabs are data-driven, no new UI.
- Existing `transforms.spec.ts` structure.

## Tasks

### T1 — transforms (test-first)

Extend `transforms.spec.ts`: pipeline emits 5 rows with PARTIALLY_REFUNDED
after REFUNDED, label 'Partially refunded', count included in totals/pct.
Then add the status to `PIPELINE_ORDER` + `PIPELINE_LABEL` (green). The
`PipelineStatus` widening breaks `bookings-pipeline.tsx` typecheck → add the
`DOT_CLASS` entry (`bg-violet-500`, file's existing palette idiom) in the
same task to keep the tree compiling.

**Accept:** `pnpm nx test @tourism/admin` green; typecheck green.

### T2 — filters tab + URL parse + stats type

1. `bookings-filters.tsx`: `TABS` += `{ value: 'PARTIALLY_REFUNDED', label:
   'Partially refunded' }` after Refunded (badge wiring is generic).
2. `app/(admin)/bookings/page.tsx`: `STATUSES` += `'PARTIALLY_REFUNDED'`.
3. `lib/dashboard/stats.ts`: `bookingsByStatus` Record gains the 5th key.

**Accept:** typecheck green; no other consumer errors.

### T3 — recent-bookings widget

`lib/dashboard/bookings-table.ts`: `BookingRowStatus` += partial.
`components/dashboard/data-table.tsx`: `STATUS_VARIANT.PARTIALLY_REFUNDED:
'destructive'`; `STATUSES` (mini tabs) += after REFUNDED; label cell →
`row.original.status.replace(/_/g, ' ').toLowerCase()`.

**Accept:** `pnpm nx run-many -t lint test build -p @tourism/admin` green.

### T4 — gate + review

Kill orphan node; full gate on `@tourism/admin`. Code-review pass (enumeration
completeness — no remaining 4-status list in admin; consistency equations).
Report admin test delta (baseline 266). **STOP before merge.**

## Post-merge (rule 9)

CHANGELOG entry (no DTO/endpoint change → no functions-*.md touch) ·
CLAUDE.md admin row · HANDOFF · roadmap P4 cell if worth a phrase. Verify on
admin.nexora-travel.agency per spec's equations (All=38 etc., filter each tab
against its badge).
