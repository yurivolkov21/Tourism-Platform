# ADR-0013 — API-driven web revalidation (tags over timers)

**Status:** Accepted · **Date:** 2026-07-17

## Context

The public web is statically rendered with passive ISR timers (300s on most
pages, 3600s on the footer, none at all on the blog list). Content edits in the
admin (Appearance slots, tours, posts, destinations, categories, testimonials)
therefore took minutes — or a redeploy — to appear. A single on-demand path
existed (review moderation → `tour:<slug>`), proving the mechanism.

## Decision

Generalize that mechanism into a repo idiom
(spec: `docs/06-specs/2026-07-17-generalized-ondemand-revalidation-design.md`):

1. **One tag taxonomy, one source of truth** — `apps/web/src/lib/revalidate.ts`
   (`TAGS` + `tourTag`/`postTag`). The API mirrors the strings by contract in
   `apps/api/src/modules/revalidation/web-revalidation.service.ts` (`WEB_TAGS`).
   Coarse tags on purpose: one per surface, fewer trigger call-sites.
2. **Every public fetch is tagged**; page `revalidate` timers stay as the
   backstop (≤300s), not the primary freshness mechanism.
3. **The API is the trigger point** (not admin server-actions): it is the single
   write choke point, covering every writer incl. future non-admin ones. Each
   mutating service fires `revalidateTags([...])` **post-commit** (never inside
   a Prisma transaction) as **fire-and-forget** — `void` + `.catch` at the call
   site, swallow + 3s timeout inside the service, no-op without
   `REVALIDATE_SECRET`. A revalidation failure can never affect a mutation
   (money-path safety); a missed bust self-heals within the ISR backstop.
4. **The web endpoint is strict**: `POST /api/revalidate`, shared-secret header,
   allow-listed tags/local paths only; any unknown entry rejects the whole
   request (400) so the endpoint can't be used to force arbitrary recompute.

## Consequences

- Content edits show on the next request (seconds); admins stop waiting on
  timers; the blog list no longer needs a redeploy.
- Adding a new public surface = add a tag to BOTH `TAGS` (web) and `WEB_TAGS`
  (api), tag the fetch, and fire it from the owning service's mutations — the
  trigger table in the spec is the checklist, and per-service unit tests assert
  the exact tag sets.
- Over-busting is accepted (coarse tags; Vercel recomputes lazily on the next
  request). Self-hosted multi-instance deploys would need a shared cache
  handler (N/A on Vercel).
