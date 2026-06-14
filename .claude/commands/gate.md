---
description: Run the full quality gate (lint + typecheck + test + build) via Nx and report pass/fail. Report-only — do not auto-fix.
allowed-tools: Bash, Read
---

Run the project quality gate from the repo root and report a concise **pass/fail
summary per check**. This is **report-only** — do NOT fix anything unless I ask;
just surface what's broken.

Run across the workspace with Nx:

```bash
pnpm nx run-many -t lint typecheck test
# The mobile app's `build` is an Expo EAS cloud build (eas-cli + credentials),
# not a per-push concern — exclude it; mobile is still covered by the line above.
pnpm nx run-many -t build --exclude=@tourism/mobile
```

Use `nx affected` instead of `run-many` if `$ARGUMENTS` says "affected". If
`$ARGUMENTS` names a single project (e.g. `@tourism/api`), run only that project
(`pnpm nx run @tourism/api:lint`, etc.).

Report each target as ✅ / ❌ with the key numbers (test counts, error/warning
counts, build status). For any ❌, show the relevant failing lines. End with one
overall verdict line.
