---
description: Regenerate the shared OpenAPI client types from the live Swagger spec (run after any backend response-DTO change).
allowed-tools: Bash
---

Regenerate the typed API client in `@tourism/core` from the live backend Swagger
spec. Do this after **any** change to a backend response DTO (the typed client
goes stale otherwise — see CLAUDE.md gotchas).

> **Status:** the typed client lives in `@tourism/core` and is wired up in **P1**.
> Until P1 lands there is nothing to regen — say so and stop.

Once P1 is in:

1. The generator hits the live Swagger JSON, so the **API must be running**
   (`pnpm nx serve @tourism/api`). Quick-check it; if it's down, tell me to
   start it and stop.
2. Run the regen target (e.g. `pnpm nx run @tourism/core:api-types`).
3. Show `git diff --stat` of the generated file and summarize what changed
   (which DTO gained/lost fields).
4. Remind me to run `/gate` (typecheck) since the regen can surface type breaks
   in consumers (web · admin · mobile).
