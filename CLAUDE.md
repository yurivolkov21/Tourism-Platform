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
| `@tourism/api` | `apps/api` | NestJS 11 · Prisma · Supabase · Stripe + PayPal · Resend · pg-boss | `scope:api,type:app` | 🟢 **Complete + deployed (Render**, `/health` + keep-alive**)** — 105 endpoints / 20 modules: CRUD · bookings + Stripe/PayPal + refunds (partial) · cancellation queue · **cancel-departure auto-refund + unpublish guard (API-W2)** · **review-moderation audit + costPrice margin w/ public strip (API-W3)** · media w/ ref-safe GC ([ADR-0011](docs/02-decisions/0011-ref-safe-media-gc.md)) · reviews/CRM · newsletter · site-media (9 brand-chrome slots) · dashboard stats (`?from&to` + per-currency, [ADR-0010](docs/02-decisions/0010-per-currency-stats-no-fx.md)) · pg-boss outbox/cron (**all 7 EmailTypes live** — API-W1 2026-07-13: branded v2 templates · Reply-To · newsletter welcome). Concurrency = single-statement atomic claims ([ADR-0009](docs/02-decisions/0009-single-statement-atomic-claims.md)). **499 unit + 8 e2e tests.** Map: [backend.md](docs/01-architecture/backend.md) · history: [CHANGELOG](docs/CHANGELOG.md). |
| `@tourism/web` | `apps/web` | Next.js 16 · React | `scope:web,type:app` | 🟢 **Complete + deployed (Vercel)** — brand **"Nexora"**; all surfaces on real data (home · destinations + 3 region pages · tours + detail · booking money-path w/ private requests · auth/account w/ **PAID-booking review form** · blog v2 (typeset article body) · contact/FAQ/legal); suitableFor "Ideal for" chips on cards/listing/detail; contact sends the full CRM lead set; a11y WCAG 2.2 AA + SEO + perf polish done; feedback layer (toast/flash + `AlertDialog` confirms); every form `noValidate` + per-field server errors (standing rule); brand chrome admin-managed via site-media w/ per-slot fallbacks; renders prefer `media.alt`; resilience layer (shape-matched `loading.tsx` skeletons · branded `error`/`not-found`/`global-error` + checkout reassurance · `settle`/`contentState` empty-vs-failed on tours/destinations/blog); shared `SectionHeading` (15 sites) + i18n sweep (page metadata → `pageMeta`, single-branded `%s — Nexora` titles, shared breadcrumb/pagination keys) + `lib/tours.ts` trimmed to types. **Web debt program W1→W4 CLOSED 2026-07-12** (W4: shared `AuthFormField` gom 16/17 field groups · all 17 forms `noValidate` · auth titles i18n). **261 tests.** Map: [frontend.md](docs/01-architecture/frontend.md) · history: [CHANGELOG](docs/CHANGELOG.md). |
| `@tourism/admin` | `apps/admin` | Next.js 16 | `scope:admin,type:app` | 🟢 **Complete + deployed (Vercel**, dev :3002**)** — Supabase SSR auth + shell · CRUD (Destinations · Categories · Tours+Departures · Posts w/ blog-v2 authoring) · operations (bookings + partial refunds · cancellation queue · reviews/CRM · enquiries + notes · subscribers · outbox · payment-events · users) · media library (reuse picker · alt editor · bulk delete · avatars hidden by default) · Appearance (9 slots) · dashboard (date-range + per-currency KPIs) · motion layer + 13 route skeletons · shared crud stack (`AdminTableShell` sortable/persisted columns · `TabPills` · `FacetFilter`) · all forms `noValidate` + per-field server errors. **266 tests.** Map: [frontend.md](docs/01-architecture/frontend.md) · history: [CHANGELOG](docs/CHANGELOG.md). |
| `@tourism/mobile` | `apps/mobile` | Expo SDK 54 / RN | `scope:mobile,type:app` | 🟢 **P5 + P5.5 feature-complete** — expo-router **5 tabs** (Home · Explore · Saved · Trips · Account) · task-first Home · browse/detail at web parity · **stepped booking** (Airbnb-style sheets; money path = web logic ported verbatim; hosted checkout via `expo-web-browser` + self-verifying result screen — **Android `openBrowserAsync` resolves immediately → verify on AppState return**) · guest-first Supabase auth (AsyncStorage session) · wishlist · native feel (ripple/haptics/reanimated). UI direction LOCKED: "Brand 100% + Structure native". Dev loop: `pnpm exec expo start` from `apps/mobile` (nx = non-interactive); `mobile:build` = `expo export`; react pinned **19.1.0**. **153 tests.** ⚠️ Combined on-device pass owed (see [HANDOFF](HANDOFF.md#next-actions)). Jest/reanimated/bottom-sheet gotchas: the mobile entries in [CHANGELOG](docs/CHANGELOG.md). |
| `@tourism/core` | `libs/shared/core` | types · API client · zod · domain logic | `scope:shared,type:data-access` | 🟢 typed OpenAPI client (P1.8) + destination helpers (region grouping/slug) + **tours filter taxonomy/`filterTours`/`sortTours` (TDD)** |
| `@tourism/tokens` | `libs/shared/tokens` | design tokens → web CSS vars + RN theme | `scope:shared,type:ui` | 🟢 **P2 done** — Style Dictionary, brand "Emerald Heritage", no-hex enforced. **+ RN hex theme (P5 W1)**: `@tourism/tokens/theme` emits hex colors (oklch→hex via culori) + dp radius + `theme.d.ts` |
| `@tourism/i18n` | `libs/shared/i18n` | EN copy catalog (EN-only) | `scope:shared,type:util` | 🟢 populated (all web surfaces read from here) |
| `@tourism/ui` | `libs/web/ui` | web design system (React) | `scope:web,type:ui` | 🟢 **P2 done** — shadcn (Base UI `base-nova`), 59 components (incl. the 2026-07 chat/AI set: attachment · bubble · message · message-scroller · marker) |
| `@tourism/mobile-ui` | `libs/mobile/ui` | mobile design system (RN) | `scope:mobile,type:ui` | 🟢 **Complete for P5/P5.5** — ThemeProvider/`useTheme` over `@tourism/tokens/theme` (RN hex, OS dark mode) · Fraunces/Geist typography (no `fontWeight` with custom fonts on Android — switch families) · 11 primitives (AppText · Screen · Spinner · Button · Card · TextField · Chip · Accordion · Badge · Skeleton · `AppSheet` bottom-sheet wrapper over `@gorhom/bottom-sheet`) · Android ripple + reanimated transitions. **34 tests.** |

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
9. **Docs sweep after EVERY feature merge** (user rule 2026-07-05, reshaped by the
   2026-07-12 docs restructure — never skip): **add ONE entry to
   `docs/CHANGELOG.md`** (date · hash · what shipped · review findings · "Tests
   after: ..." baselines) — history and test-count progression live ONLY there.
   Then update the touched **current-state** docs (keep them SHORT — never append
   wave narratives to them): the feature plan's STATUS · the `docs/roadmap.md`
   phase cell (1–3 sentences) · this file's project-table row · `HANDOFF.md`
   current-state/next-actions, **plus** any reference doc the feature invalidated
   (`docs/03-reference/functions-*.md` for endpoints · `data-model.md` for schema ·
   `backend.md`/`frontend.md` for modules/routes · a new ADR for a new
   architectural idiom). Current-state docs carry ONLY the current test
   baseline (bump it in place); the progression across merges lives solely in
   the changelog.

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

- **Kill orphaned node processes before any new nx/jest/metro run** — they
  deadlock `.nx/workspace-data` (a stopped task can orphan children on
  Windows) and the next run false-reds or hangs (user rule 2026-07-08).
- **The remote branch `origin/nghia` must NEVER be deleted** — teammate's live
  mobile lane, even when it looks merged.
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

### Model routing for subagents (standing, agreed 2026-07-05)

Match the subagent's model to the task — don't spend a frontier model on mechanical work:

| Task type | Model |
| --- | --- |
| Transcribing code from a plan's ready snippets · mechanical docs sweeps · bulk renames | `haiku` — ALWAYS instruct "do not reformat lines the task doesn't name" (known haiku gotcha; it also can't type `\uXXXX` escapes — script those) |
| Ordinary implementation tasks from a written plan · tests from a written spec · medium Explore sweeps | `sonnet` |
| Writing specs/plans · adversarial review (ALWAYS for money-path/payments/migrations) · hard debugging | `opus`/`fable` (strong tier) |
| Main-loop orchestration, decisions, merge gates | the session model |

Every dispatch carries the repo constraints (straight quotes · no unrelated-line
reformatting · Conventional Commits · TDD on pure logic).
