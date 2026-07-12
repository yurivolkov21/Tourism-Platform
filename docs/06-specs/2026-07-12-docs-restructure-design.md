# Docs restructure — design spec

**Date:** 2026-07-12 · **Scope:** all docs EXCEPT `06-specs/` + `07-plans/`
(content), plus root `README.md`/`HANDOFF.md`/`CLAUDE.md`, plus one code
side-fix (`apps/api/prisma/reset.ts`). · **Status:** approved (user
2026-07-12): ADRs = content-immutable, format-only · history → new
`docs/CHANGELOG.md` · `CLAUDE.md` slimmed too.

## Why

Three audits (2026-07-12) found: the doc set is **accurate in the leaves but
drowning in append-only blobs at the top** — `roadmap.md` holds ~2,500-word
single table cells, `HANDOFF.md`'s current-state is one ~1,500-word run-on
line, `CLAUDE.md` carries four ~1,000-word status cells loaded into every AI
session. Project status + test counts live in **6+ homes** each (rule 9 even
mandates the duplication). Plus: 12 shipped endpoints missing from the
`03-reference` catalogs, 4 architectural idioms with no ADR, 2 broken-link
classes, frontend.md's Mobile section still says "scaffold", and `reset.ts`
silently skips 7 newer tables.

## Content rules (the actual fix)

**One home per fact class.** Everything else links to the home instead of
restating it:

| Fact class | Single home |
| --- | --- |
| Wave-by-wave history + test-count progression | **`docs/CHANGELOG.md`** (new) |
| Phase status (short) | `docs/roadmap.md` (1–3 sentences per phase + changelog links) |
| Current per-app state | `HANDOFF.md` (short) · `CLAUDE.md` table (3–6 lines/cell) |
| Architecture facts | `01-architecture/*` |
| Endpoint behavior | `03-reference/functions-*.md` |
| Decisions + rationale | `02-decisions/` ADRs |
| Commands/env/deploy | `04-guides` + `05-runbooks` |

**History is append-only in ONE place:** `docs/CHANGELOG.md`, reverse-
chronological, one entry per merge to `main` (date · hash · scope line ·
detail bullets · test baselines after the merge). Seeded by mining the
existing roadmap/HANDOFF/CLAUDE blobs + `git log` — no information is lost,
it *moves*.

## Target changes by file

- **`docs/CHANGELOG.md` (NEW)** — the full project history distilled from the
  blobs (BLUEPRINT era → today), newest first.
- **`docs/roadmap.md` (REWRITE)** — phase table stays, every status cell cut
  to 1–3 sentences + "details: changelog". A cell may state the CURRENT test
  baseline (bumped in place per rule 9); the count *progression* lives only
  in the changelog.
- **`HANDOFF.md` (REWRITE)** — what/why · locked-decisions table · short
  per-app frontier (~6 lines each) · next actions · pointers. History stack
  deleted (lives in changelog). Fix stale repo path (l.12) + the two `+`
  bullet-style lint hits.
- **`CLAUDE.md` (SLIM)** — project-table cells cut to: stack · status
  one-liner · current test count · pointers (`docs/CHANGELOG.md`,
  architecture docs). Rules/gotchas/skills/model-routing/commands sections
  UNCHANGED. **Rule 9 rewritten**: sweep = add a changelog entry + update the
  touched current-state docs (roadmap cell, CLAUDE row, HANDOFF frontier,
  invalidated reference docs) — no more "test counts everywhere they appear".
- **`01-architecture/`** — apply audit findings: `data-model.md` 24→25 models
  (×2) · `backend.md` add `cancellations` + `site-media` modules, refresh
  status line (439 tests, 2026-07-12), add missing feature-coverage bullets
  (cancellation queue · site-media · EnquiryNote CRM · subscriber/outbox
  deletes · payment-events) · `frontend.md` rewrite Mobile section (P5+P5.5
  complete, 5 tabs, real app), rewrite Data-strategy (live-data era), add
  admin Users-management surface, refresh component tree (`feedback/`,
  `seo/`, real `lib/` modules), trim the admin paragraph-changelog to short
  current-state + changelog link.
- **`02-decisions/`** — existing ADRs: NO content changes. ADD:
  **0009** single-statement locking-CTE concurrency idiom (seat-claim +
  last-admin) · **0010** per-currency no-FX stats aggregation ·
  **0011** ref-safe media GC (guarded enqueue + destroy backstop + re-attach
  defuse + accepted residuals) · **0012** scheduled publishing via read-time
  filter (no cron). Update index README.
- **`03-reference/`** — add the 12 missing endpoint rows: admin `GET
  /admin/users` · `GET /admin/users/me` · `GET /admin/users/:id` · `GET
  /admin/outbox` · `POST /admin/outbox/:id/retry` · `PATCH
  /admin/reviews/:id/feature` · `DELETE /admin/reviews/:id` · `POST
  /admin/reviews/curated`; customer `POST /users/me/avatar/sign` · `DELETE
  /users/me` · `GET /reviews/featured` · `GET /reviews/summary`. Follow each
  catalog's existing VN table format + ID scheme. Structure unchanged (the
  catalogs are the "good model": tables current + Lịch sử separated).
- **`04-guides/` + `05-runbooks/`** — fix the 6 `apps/api/postman/README.md`
  broken references (folder doesn't exist — drop or repoint to
  `05-runbooks/local-dev.md` test-data section) · `local-dev.md`: fix the
  Defender exclusion path to the real repo location, "17 tables" → 25 (via
  reset.ts fix below) · `05-runbooks/README.md`: fix the phantom "seed" row.
- **`docs/README.md`** — index: add `CHANGELOG.md` + `email-templates/`,
  fix the 01-architecture/05-runbooks blurbs, keep reading path.
- **root `README.md`** — fix postman links; status table → one line + link
  to roadmap/changelog.
- **`docs/BLUEPRINT.md`** — historical, content kept; fix the broken
  `../research/...` link → `03-reference/reference-sites-analysis.md`;
  annotate §6 counts as founding-sketch (25/16 is in data-model.md).
- **CODE side-fix: `apps/api/prisma/reset.ts`** — TABLES list is missing 7
  newer tables (`cancellation_requests`, `enquiry_notes`, `subscribers`,
  `site_media_slots`, `post_tags`, `post_tag_links`, `post_tours`) — without
  them "reset to empty" leaves `subscribers`/`site_media_slots`/`post_tags`
  populated (no FK into the truncated set → CASCADE never reaches them). Add
  the 7 names (matches the script's own "every @@map table" contract).

## Non-goals

- `06-specs/` + `07-plans/` content untouched (this spec/plan pair is the
  only addition).
- ADR content rewrites (immutable records).
- New lint tooling (`markdownlint-cli2` devDep) — the tuned
  `.markdownlint.jsonc` + IDE extension already govern; revisit only if
  drift recurs.
- `playground.md` (scaffold artifact, not documentation — flagged to the
  user, left alone).

## Verification

- Every relative link in the touched set resolves (scripted check).
- No doc claim contradicts the audits' verified code facts; anything not in
  the audit reports gets re-checked against code before being written.
- Manual markdownlint pass vs `.markdownlint.jsonc` on rewritten files
  (incl. the HANDOFF `+`-bullet hits).
- `pnpm format:check` still green (markdown out of scope, reset.ts in
  scope) · api suite green after reset.ts change (no spec covers it — it's
  a const list; typecheck covers).
- Adversarial-style review pass: a reviewer agent re-reads the new
  CHANGELOG against the deleted blobs to confirm no history was dropped.

## Definition of done

`roadmap.md`/`HANDOFF.md`/`CLAUDE.md` are current-state-only; roadmap +
HANDOFF land well under 1/3 of today's byte size, CLAUDE.md's *table* does
too (its rules/gotchas/commands sections are deliberately unchanged, so the
whole file lands near 1/2); full history reads top-down in one changelog; the
catalogs cover all 104 live endpoints; 12 ADRs; zero broken links; reset.ts
truncates all 25 tables; rule 9 updated so future sweeps write ONE changelog
entry instead of six blob appends.
