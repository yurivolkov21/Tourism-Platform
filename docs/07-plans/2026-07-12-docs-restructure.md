# Docs restructure — implementation plan

**Spec:** `docs/06-specs/2026-07-12-docs-restructure-design.md`
**Branch:** `chore/docs-restructure` · **Scope:** docs (minus 06/07 content) + root README/HANDOFF/CLAUDE + `reset.ts`

**STATUS: 🔨 IN PROGRESS** (started 2026-07-12)

Standing rules: source-of-truth wins (verify against code, never copy stale
claims forward) · ADR content immutable · straight quotes · respect
`.markdownlint.jsonc` · Conventional Commits, no AI attribution · user
confirms before merge.

## Tasks

### T1 — `docs/CHANGELOG.md` (agent, must land before T3)

- [ ] Mine the history blobs (roadmap P1/P4/P5/P5.5 cells · HANDOFF l.34 +
      history stack · CLAUDE.md table cells · catalog Lịch sử sections) +
      `git log` into one reverse-chronological changelog: `## YYYY-MM-DD —
      title (hash)` + detail bullets + post-merge test baselines. Nothing
      dropped — history MOVES here.

### T2 — accuracy + reference fixes (agent, parallel)

- [ ] 01-architecture: data-model 24→25 ×2 · backend.md modules/status/
      coverage · frontend.md Mobile rewrite + Data-strategy rewrite + admin
      Users surface + component tree + admin-blob trim.
- [ ] 03-reference: +8 admin rows, +4 customer rows (audit list, VN format).
- [ ] Links: BLUEPRINT `../research/...` → 03-reference · 6× postman refs
      dropped/repointed · `docs/README.md` index (+CHANGELOG,
      +email-templates, blurbs) · root README (links + slim status table).
- [ ] Runbooks: Defender path · tables count · runbooks README seed row.
- [ ] `reset.ts`: add the 7 missing tables (25 total).

### T3 — ADRs 0009–0012 + index (agent, parallel)

- [ ] 0009 locking-CTE idiom · 0010 per-currency no-FX · 0011 ref-safe media
      GC · 0012 read-time scheduled publishing. House ADR format; update
      `02-decisions/README.md`.

### T4 — core rewrites (main session, after T1)

- [ ] `docs/roadmap.md` — short status cells + changelog links.
- [ ] `HANDOFF.md` — short current-state; history deleted; path + `+`-bullet
      fixes.
- [ ] `CLAUDE.md` — slim table cells; rule 9 rewritten to the
      changelog-first sweep.

### T5 — verify + review + merge

- [ ] Scripted relative-link check over the touched set; manual lint pass.
- [ ] Reviewer agent: CHANGELOG vs deleted blobs (no history lost) + spot
      re-verify new claims against code.
- [ ] `pnpm format:check` + api typecheck/test (reset.ts) green.
- [ ] Report → user confirms → commit → ff-merge → push → delete branch.
      (Docs sweep for THIS merge = its own changelog entry — first use of
      the new rule 9.)
