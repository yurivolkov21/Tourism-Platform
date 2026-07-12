# ADR-0012 — Scheduled publishing via read-time filter (no cron)

**Status:** Accepted · **Date:** 2026-07-12 (retroactive record — decision
shipped earlier; see date in Context)

## Context

Admin wave C (2026-07-11) added post scheduling. The obvious implementation —
a scheduler job (pg-boss cron flipping `DRAFT` → `PUBLISHED` at the scheduled
instant) — adds a new job, a new failure mode, and a visible delay equal to
the cron's polling granularity.

## Decision

`Post.publishedAt` may be set to a future timestamp while `status` is already
`PUBLISHED`. The public reader already filters
`status = PUBLISHED AND publishedAt <= now()`
(`apps/api/src/modules/posts/posts.service.ts` — `findPublicBySlug` ~L102–108,
tag counts ~L134–139, public list ~L490) — so a "scheduled" post is simply a
`PUBLISHED` row whose timestamp hasn't arrived yet; no separate state, no
cron, nothing to fail. The admin list derives a "Scheduled" badge from the
same timestamp comparison rather than a stored flag.

Explicit/nullable `publishedAt` semantics (`update`, ~L285–302; `create`,
~L223–237): an explicit date always wins over the automatic flip-stamp
(scheduling a future post on create/edit); `null` on an already-`PUBLISHED`
post re-stamps `now` (publish immediately); `null` on a `DRAFT` clears the
date entirely.

## Consequences

- Zero added infrastructure — no new job, no new failure mode to monitor.
- Publish instant is exact at read time (no cron-interval slop).
- The tradeoff: "scheduled" posts are ordinary `PUBLISHED` rows, so every
  query path that can expose a post publicly (RLS policies, public list,
  public detail, tag counts) must carry the `publishedAt <= now()` predicate
  itself — there is no single gate. Verified all current public paths do.

See `apps/api/src/modules/posts/posts.service.ts` and the wave C spec
(`docs/06-specs/2026-07-11-admin-wave-c-design.md`).
