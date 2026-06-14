---
description: Seed local test data + the self-signed paid-booking harness (makes the API suite + e2e runnable).
allowed-tools: Bash
---

Seed the local test data so the API suite and e2e can run.

> **Status:** the seed + Postman/Newman harness is **ported in P1** (backend).
> Until P1 lands there is nothing to seed — say so and stop.

Once P1 is in:

1. The seed needs the **API running** (`pnpm nx serve @tourism/api`).
   Quick-check it first; if it's not up, tell me to start it and stop — don't
   start it yourself unless I ask.
2. Run the seed target (e.g. `pnpm nx run @tourism/api:seed`).
3. Report what it printed: the customer/admin accounts, the generated
   **paid-booking codes**, and where the test env file was written.

Reads secrets from `apps/api/.env`; prints no secret values.
