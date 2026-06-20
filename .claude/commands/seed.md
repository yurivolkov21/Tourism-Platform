---
description: Seed local test data + the self-signed paid-booking harness (makes the API suite + e2e runnable).
allowed-tools: Bash
---

Seed the catalog + test accounts so the API suite and e2e can run.

> **Status:** landed in **P1.8a**. The seed connects to the DB **directly**
> (`DIRECT_URL`, port 5432) — it does NOT need the API running.

To seed:

1. Ensure `apps/api/.env` has `DIRECT_URL` (Supabase direct 5432).
2. Run the seed target: `pnpm nx run @tourism/api:seed`. It's **idempotent** —
   re-running refreshes content without duplicating rows (upsert by slug; the
   self-signed PAID booking is created once).
3. Report what it printed: the customer/admin accounts, the **paid-booking code**
   (`BK-SEEDPAID`), and the generated `apps/api/.env.e2e` (gitignored) consumed
   by the e2e suite (P1.8c).

Reads secrets from `apps/api/.env`; prints no secret values. **Writes to the live
Supabase dev DB** — confirm before running if that matters.
