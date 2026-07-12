# ADR-0009 — Concurrency control via single-statement atomic claims (no interactive locks)

**Status:** Accepted · **Date:** 2026-07-12 (retroactive record — decision
shipped earlier; see date in Context)

## Context

The Supabase transaction pooler runs with `connection_limit=1` and
statement-scoped transactions ([backend.md](../01-architecture/backend.md)) —
it can't safely host an interactive `$transaction` that holds a
`SELECT ... FOR UPDATE` across statements. Plain check-then-act (count/read
then write) is racy under READ COMMITTED: two seat claims, or two admin
demotes, can both pass the check and both write. The seat-claim idiom shipped
with payments (P1.5); the last-admin lock shipped in wave D2 (2026-07-12) and
made the pattern explicit.

## Decision

Enforce every race-prone invariant in **one autocommit SQL statement**, in two
shapes:

- **(a) Conditional data-modifying CTE** — the guard is folded into the
  `UPDATE`'s `WHERE`, and a non-empty `RETURNING` is the success signal. Seat
  claim `claimSeatsForPaid` in
  `apps/api/src/modules/payments/payments.service.ts` (`claimSeatsForPaid`,
  ~L258) claims seats only if they fit **and** the booking is still PENDING,
  and inserts the outbox row in the same statement. Conditional `updateMany`
  claims elsewhere (e.g. `apps/api/src/modules/cancellations/cancellations.service.ts`
  ~L205) are the degenerate single-row form of the same idiom.
- **(b) Locking CTE** when the invariant is an **aggregate**:
  `WITH x AS (SELECT ... FOR UPDATE ORDER BY id) UPDATE ... WHERE ... AND (SELECT COUNT(*) FROM x) > 1 RETURNING`.
  Last-admin demote in
  `apps/api/src/modules/users/admin-users.service.ts` (`changeRole`, ~L190)
  locks all ADMIN rows for the statement's duration only; EvalPlanQual
  re-check makes the loser of a concurrent race see the winner's commit;
  `ORDER BY id` prevents deadlock (verified adversarially 2026-07-12, wave
  D2). Companion: `deleteUser`'s role-conditional `deleteMany` (~L270) closes
  the promote→demote→delete bypass of the same invariant.

## Consequences

- Pooler-safe: no lock is held across statements, no interactive transaction
  is required.
- Each new invariant needs a hand-written statement — there is no reusable
  helper, so the pattern must be re-applied by hand each time.
- `FOR UPDATE` held **across** statements remains banned; it is only safe
  inside a single autocommit CTE.

See [backend.md](../01-architecture/backend.md) and the wave D2 spec
(`docs/06-specs/2026-07-12-admin-wave-d2-design.md`) for the adversarial
review that hardened the last-admin case.
