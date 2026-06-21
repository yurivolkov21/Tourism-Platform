---
description: Kick off a new feature the project way — confirm scope, branch, then scaffold a design spec + implementation plan (spec→plan→execute).
argument-hint: <short feature description>
---

We're starting a new feature: **$ARGUMENTS**

Follow the project's spec→plan→execute workflow (CLAUDE.md §"How we work"). Do
**not** write feature code yet.

1. **Restate the goal** in one or two sentences, then **ask me any scope
   questions** (use AskUserQuestion for genuine either/or decisions). Confirm
   scope before touching code.
2. Once scope is agreed, create a feature branch: `feat/<kebab-name>` (never
   work on `main`).
3. Write a **design spec** at `docs/06-specs/<YYYY-MM-DD>-<kebab-name>-design.md`:
   Goal & Scope, locked decisions, in/out of scope, per-section design, i18n
   (EN/VI), testing, planned files, risks.
4. Write an **implementation plan** at `docs/07-plans/<YYYY-MM-DD>-<kebab-name>.md`:
   dependency-ordered tasks, TDD on pure logic, an acceptance check per task, a
   sequencing line, and a "reused seams" list.
5. Commit the spec + plan (`docs(<area>): <feature> spec + plan`), then execute
   task-by-task. Hold to: layout-first + theme tokens only + reuse `@tourism/ui`
   first; EN/VI parity; module boundaries (lint enforces).
6. Finish with `/gate` + e2e, then **STOP and confirm with me before**
   merge/push/branch-delete.

Start at step 1 now.
