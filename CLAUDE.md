<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

## CLAUDE.md — tourism-platform

Guidelines for any AI agent (or human) working in this repo. This is the map +
the rules; deep plan detail lives in [`HANDOFF.md`](HANDOFF.md) and
[`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

> **Source of truth wins.** When this file or any doc disagrees with the code
> (`apps/*/src`, `apps/api/prisma/schema.prisma`, the running Swagger spec), the
> code is right — fix the doc.

## What this is

**Nx 22 + pnpm** monorepo for a Lily-style tourism booking platform, with
**mobile from day one**. Greenfield rebuild of the frozen donor repo
`tourism-be-api` (read-only — port proven code, never modify it).

| Project | Path | Stack | Tags | Status |
| --- | --- | --- | --- | --- |
| `@tourism/api` | `apps/api` | NestJS 11 · Prisma · Supabase · Stripe + PayPal · Resend · pg-boss | `scope:api,type:app` | 🟢 **P1 complete + DEPLOYED** (P1.1–P1.8 + P1.x): schema+RLS, envelope, auth, CRUD, bookings, Stripe+PayPal, media, reviews/wishlist/enquiry/stats, seed+client+e2e, pg-boss jobs; **+ Posts CRUD + admin bookings list/detail + next-departure availability on tour summaries** + **blog-v2 BE** (post tags/related-tours/author on `PostDto` · body-image endpoint `MediaRole.body`, race-free upsert register + GC-on-delete · **newsletter**: `Subscriber` model + public throttled subscribe w/ silent dedupe + admin list) (~99% of P4 admin scope, 314 tests). Live on **Render** (`/health` + cron-job.org keep-alive). |
| `@tourism/web` | `apps/web` | Next.js 16 · React | `scope:web,type:app` | 🟢 **P3 + P6 DONE + DEPLOYED** — **brand "Nexora"** · redesigned navbar · home · destinations (overview + 3 region pages) · `/faq` `/privacy` `/terms` · about · **contact** (Contact-01 form → DB · interest dropdown from live categories · map) · **tours (listing + free-text search + pagination + availability badge + detail)** · **auth** (login/register/forgot/reset, Supabase) · **account** (dashboard · settings · bookings + **booking detail/cancel/refund-request** · saved) · **booking flow** (Stripe/PayPal + private-departure request + checkout pages + inline date-picker) · reviews (real DB) · **wishlist save-UI** (heart on detail · manage in account) · **component reform done** (forms → `@tourism/ui`). **Real data WIRED** (home · `/destinations` · region-detail · `/tours` · detail · enquiry · reviews · contact · wishlist · bookings · **blog**). **Polish pass DONE** (a11y WCAG 2.2 AA · SEO sitemap/robots/JSON-LD/OG · perf/motion). **P6 blog reader DONE** (2026-07-03): `/blog` magazine index + pagination · `/blog/[slug]` markdown article (reading time · outline rail · more-posts) · home teaser real data · Journal nav/footer/sitemap · **blog-v2 reader funnel** (`?tag=`/`?q=` filter chips · tag chips on cards + article header · related-by-tag "more posts") · **blog-v2 wave-4 reader polish** (prev/next nav · share row · outline scrollspy + scroll-progress · "Updated on" stamp · outline-anchor fix) · **blog-v2 wave-5** (live footer newsletter signup · `/blog/rss.xml`; 182 tests) → **P3+P6 web complete, blog-v2 COMPLETE** |
| `@tourism/admin` | `apps/admin` | Next.js 16 | `scope:admin,type:app` | 🟢 **P4 CRUD done + DEPLOYED** — auth + shell + dashboard + **CRUD: Destinations · Categories · Tours · Departures · Posts** (Server Components + Server Actions) · **blog-v2 admin: post tag combobox (create inline) + related-tours picker + inline body-image editor** (insert-image button → Cloudinary → `body` asset · Write\|Preview toggle · `/media` `body` facet) · **Subscribers list + CSV export under Operations** (146 tests). · **UI parity pass done** (outbox + dashboard table on the shared table stack; 149 tests) — **P4 complete, nothing remaining**. Live on **Vercel**. |
| `@tourism/mobile` | `apps/mobile` | Expo SDK 54 / RN | `scope:mobile,type:app` | 🚧 scaffold (P5) |
| `@tourism/core` | `libs/shared/core` | types · API client · zod · domain logic | `scope:shared,type:data-access` | 🟢 typed OpenAPI client (P1.8) + destination helpers (region grouping/slug) + **tours filter taxonomy/`filterTours`/`sortTours` (TDD)** |
| `@tourism/tokens` | `libs/shared/tokens` | design tokens → web CSS vars + RN theme | `scope:shared,type:ui` | 🟢 **P2 done** — Style Dictionary, brand "Emerald Heritage", no-hex enforced |
| `@tourism/i18n` | `libs/shared/i18n` | EN copy catalog (EN-only) | `scope:shared,type:util` | 🟢 populated (all web surfaces read from here) |
| `@tourism/ui` | `libs/web/ui` | web design system (React) | `scope:web,type:ui` | 🟢 **P2 done** — shadcn (Base UI `base-nova`), 54 components |
| `@tourism/mobile-ui` | `libs/mobile/ui` | mobile design system (RN) | `scope:mobile,type:ui` | 🚧 scaffold (P5) |

- Auth is **Supabase** (the API verifies the JWT and mirrors users locally) —
  do **not** rewrite to self-managed auth.
- **Module boundaries are enforced** in `eslint.config.mjs` via
  `@nx/enforce-module-boundaries` (BLUEPRINT §3). A bad cross-scope/cross-type
  import **fails lint**, not just review.

## How we work (standing conventions)

Non-negotiable unless the user says otherwise in the moment.

1. **One feature = one branch.** Never commit feature work directly to `main`.
   Branch → implement → **the user reviews** → merge → delete branch. Small
   docs/meta fixes may go straight to `main`. **Enforced on GitHub:** a ruleset
   on `main` requires a **PR + 1 approval** (+ blocks force-push/deletion);
   **repo admins (owner) bypass**, so non-owner contributors must branch + PR.
2. **Ask before starting a new feature/phase**, and **confirm before any
   merge/push/branch-delete**.
3. **Spec → plan → execute.** For multi-step features: write a design spec +
   implementation plan under `docs/` first, then execute task-by-task (TDD on
   pure logic), then review, then e2e.
4. **TDD on logic.** Test-first for pure functions / helpers / server actions;
   target ≥80% on new logic. Visual/layout is covered by e2e.
5. **Frontend = layout-first, theme tokens only.** No hex colors — use
   `@tourism/tokens`. **Reuse `@tourism/ui` first** before building new.
6. **English-only** (ADR-0005). User-facing copy is centralized in
   `@tourism/i18n` (EN-only scaffold); no VI / parity check. Schema is
   single-language (no `*_vi`).
7. **Run `/gate` before declaring green** (lint + typecheck + test + build).
8. **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
   `test:`, `chore:`). No AI attribution (disabled globally).
9. **Docs sweep after EVERY feature merge** (user rule 2026-07-05 — never skip): the
   feature plan's STATUS · `docs/roadmap.md` phase row · this file's project table ·
   `HANDOFF.md` current-state/next-action, **plus** any reference doc the feature
   invalidated: `docs/03-reference/functions-*.md` when endpoints changed ·
   `docs/01-architecture/data-model.md` when the schema changed · `backend.md`/
   `frontend.md` when modules/routes changed. Test-count baselines everywhere they
   appear. (The 2026-07-05 audit found catalogs/architecture docs silently stale —
   that class of drift is what this rule prevents.)

## Commands (from repo root)

```bash
pnpm install
pnpm nx run-many -t lint typecheck test build   # whole workspace
pnpm nx affected -t lint typecheck test build   # only what changed
pnpm nx lint @tourism/api                        # one project
pnpm nx graph                                    # project graph
```

- Node ≥ 22, **pnpm 11** (`corepack enable`). Backend env: `apps/api/.env`.

## Layout

```text
apps/   api (NestJS) · web + admin (Next.js) · mobile (Expo)
libs/   shared/{core,tokens,i18n} · web/ui · mobile/ui
docs/   README.md (index + reading path) · BLUEPRINT.md · roadmap.md
        01-architecture/ · 02-decisions/ (ADRs) · 03-reference/ · 04-guides/ · 05-runbooks/ · 06-specs/ · 07-plans/
```

## Gotchas (load-bearing, non-obvious)

- **pnpm 11 reads `overrides` + `allowBuilds` from `pnpm-workspace.yaml`, NOT
  `package.json`** (`pnpm.overrides` there is ignored with a warning). Gotcha:
  editing `overrides` alone often does **not** re-resolve — also touch
  `package.json` or delete the lockfile to force it (verified 2026-06-15).
- **Nx generators run `pnpm install` internally** — an un-approved build script
  blocks them (governed by `allowBuilds` in `pnpm-workspace.yaml`).
- **Two libs can't share a leaf name** (e.g. `ui`) → mobile's lib is the Nx
  project `mobile-ui` (package `@tourism/mobile-ui`).
- **`tsc --noEmit` includes `*.spec.ts`; `nest build` excludes them** — run
  `typecheck`, not just `build` (donor CI lesson).
- **Prisma needs a driver adapter** (`PrismaPg`); the Supabase transaction
  pooler (`connection_limit=1`) can't start a batch `$transaction` under
  concurrency — use `Promise.all` for parallel reads. *(applies once P1 lands)*
- **Next.js 16 / Expo SDK 54 are not in training data** — read live docs before
  writing routing/RSC/native code.
- Windows: CRLF warnings on commit are harmless.

## AI infra in this repo

- `.claude/commands/` — project slash commands: `/gate` (quality gate),
  `/seed` (test data — P1), `/regen-types` (FE OpenAPI client after a BE DTO
  change — P1), `/new-feature <desc>` (kick off spec→plan→execute).
- Session handoff lives in the roadmap plans' **STATUS / RESUME STATE** blocks under
  `docs/07-plans/` (the old `.remember/` dir is gone).

### Skill conventions (standing, agreed with the user 2026-07-05)

Situation → skill to invoke BEFORE acting (plugin skills installed in Claude Code):

| Situation | Skill |
| --- | --- |
| New feature/phase with **no spec yet** | `superpowers:brainstorming` → then `/new-feature` (spec → plan) |
| A written plan exists in `docs/07-plans/` | `superpowers:executing-plans` (follow it task-by-task, raise concerns first) |
| Implementing any pure logic | `superpowers:test-driven-development` — failing spec first, red → green per task |
| A real bug / failing test / unexpected behavior | `superpowers:systematic-debugging` before proposing fixes |
| Touching post-training APIs (Next.js 16 · Expo SDK 54 · Prisma 7) or any unfamiliar library | `context7` live-docs lookup first — never write from memory |
| Declaring a slice green | `/gate` (lint + typecheck + test + build) |
| After any BE response-DTO change | `/regen-types` |
| Broad multi-file searching/auditing | fan out `Explore` subagents (don't grind through files inline) |
| Repo overview / onboarding a teammate (on request) | `understand-anything` (`/understand`, `/understand-onboard`) |

Merge flow stays as "How we work" #1–2: user reviews source → rebase + `--ff-only`.
These are defaults, not ceremony — skip only when the user explicitly says so.
