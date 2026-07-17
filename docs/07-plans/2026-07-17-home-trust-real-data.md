# Home trust real data — implementation plan

**Spec:** [`docs/06-specs/2026-07-17-home-trust-real-data-design.md`](../06-specs/2026-07-17-home-trust-real-data-design.md)
**Branch:** `feat/home-trust-real-data` · **Date:** 2026-07-17

## STATUS

- [ ] T1 `trust-section.ts` row builder + grid map (TDD)
- [ ] T2 i18n reshape (`trust.labels`, delete fake stats + testimonial fixture)
- [ ] T3 `Trust` → prop-fed; wire `page.tsx`
- [ ] T4 `Testimonials` fallback removal + tests (+ destinations comment refresh)
- [ ] T5 gate + review

**RESUME STATE:** _(update as tasks complete)_

## Sequencing

T1 → T2 → T3/T4 (independent) → T5.

## Reused seams

- `fetchTrustStats` + `TrustStats`/`TrustStat` types (`lib/trust-band.ts`) —
  home already fetches; NO new requests/endpoints.
- `MetricValue` (count-up renderer) stays for row values.
- Barrel-mock component-test convention (`password-field.spec.tsx`).
- No API/`@tourism/core` changes; `GET /reviews/featured|summary` already
  public + typed.

## Tasks

### T1 — trust-section logic (test-first)

`apps/web/src/lib/trust-section.spec.ts` FIRST, then `trust-section.ts`:
`buildTrustSectionStats` (rating formatted `x.x/5`, hidden on null; tours row
hidden on 0; support row constant; order) + `trustGridClass` (1–4 map, clamp).

**Accept:** `pnpm nx test @tourism/web` green.

### T2 — i18n reshape

`messages.trust`: replace `stats` array with `labels` object
(rating/itineraries/supportValue/supportLabel). Delete `testimonials.items`.
Keep heading/subtitle/eyebrow.

**Accept:** typecheck flags every remaining consumer of the deleted keys —
fixed in T3/T4 (no stragglers at gate).

### T3 — Trust prop-fed

`trust.tsx`: `{ stats: TrustStats }` prop → `buildTrustSectionStats(stats,
labels)` rows → `<dl className={trustGridClass(rows.length)}>`. `page.tsx`:
`<Trust stats={trustStats} />`.

**Accept:** typecheck + web build green.

### T4 — Testimonials fallback removal

`testimonials.tsx`: empty/undefined `items` → `return null`; render `items`
directly (drop `t.items` read). Refresh the stale comment in
`destinations/page.tsx`. New `testimonials.spec.tsx`: renders provided items;
empty → nothing; fixture names absent.

**Accept:** web tests green.

### T5 — gate + review

`pnpm nx run-many -t lint test build -p @tourism/web @tourism/i18n` (kill
orphan node first). Code-review pass (honesty of hidden-row logic, i18n key
removal completeness, no leftover fixture reads). Report web delta (baseline
366). **STOP before merge.**

## Post-merge (rule 9)

CHANGELOG · CLAUDE.md web row · HANDOFF · roadmap P3 · `frontend.md` (home
Trust note). Verify per brief: empty-DB home hides rating row + testimonials;
after approving + featuring reviews, rating/testimonials reflect them and the
itinerary count matches published tours.
