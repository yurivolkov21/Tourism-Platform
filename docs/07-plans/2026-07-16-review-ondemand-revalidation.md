# Review on-demand revalidation — implementation plan

**Spec:** [`docs/06-specs/2026-07-16-review-ondemand-revalidation-design.md`](../06-specs/2026-07-16-review-ondemand-revalidation-design.md)
**Branch:** `feat/review-ondemand-revalidation` · **Date:** 2026-07-16

## STATUS

- [ ] T0 context7 confirm (Next 16 `revalidateTag` / Route Handler · openapi-fetch `next.tags`)
- [ ] T1 web pure logic — `tourTag` + `isValidRevalidateSecret` (TDD)
- [ ] T2 web revalidate route handler + tests
- [ ] T3 web tag the tour fetches (reviews + detail)
- [ ] T4 API `WebRevalidationService` + config/env + tests
- [ ] T5 hook `moderateById` post-commit + tests
- [ ] T6 env docs (`.env.example` ×2)
- [ ] T7 gate + review

**RESUME STATE:** _(update as tasks complete)_

## Sequencing

T0 first (gates the fetch-tagging + route API shape). Then two independent lanes:
**web** T1 → T2 → T3, **api** T4 → T5. T6 after both. T7 last. Web and API lanes
have no shared code, so they can interleave.

## Reused seams

- Route handler pattern: `apps/web/src/app/api/hello/route.ts` (existing).
- Config pattern: `registerAs` namespaces in `apps/api/src/config/configuration.ts`
  + Joi in `env.validation.ts`; optional-key precedent = `chatConfig` /
  `ANTHROPIC_API_KEY`.
- API already depends on `@tourism/core` (transform interceptor / exception
  filter) — no new cross-project edge introduced; global `fetch` (Node 22).
- `@tourism/core` API client init `createApiClient({ baseUrl, fetch? })`
  (`libs/shared/core/src/lib/api/client.ts`) — fallback tagging seam if needed.
- Jest conventions: co-located `*.spec.ts(x)`; mock `next/cache` for the route
  test; API service specs mock `ConfigService` + `PrismaService` as in
  `outbox.service.spec.ts` / `reviews.service.spec.ts`.

## Tasks

### T0 — confirm Next 16 + openapi-fetch APIs (context7)

Look up: (a) Next.js 16 `revalidateTag` import + Route Handler signature, (b)
tagging a `fetch` with `next: { tags }` under App Router, (c) that `openapi-fetch`
forwards unknown request-init keys to `fetch`. Record the confirmed shapes inline
in this plan's RESUME STATE. If openapi-fetch does NOT forward `next`, switch T3
to a `fetch` wrapper passed into `createApiClient`.

**Accept:** confirmed signatures noted; no code from memory on post-training APIs.

### T1 — web pure logic, test-first

`apps/web/src/lib/revalidate.spec.ts` FIRST (red), then `revalidate.ts` (green):
- `tourTag('ha-long')` → `'tour:ha-long'`.
- `isValidRevalidateSecret`: `('','x')`, `('x','')`, `('','')`, `('ab','abc')`,
  `('abd','abc')` → `false`; `('abc','abc')` → `true`.

**Accept:** `pnpm nx test @tourism/web` green; helpers referenced nowhere yet.

### T2 — web revalidate route handler

`apps/web/src/app/api/revalidate/route.ts` — `POST` per spec: 503 (server secret
unset) · 401 (missing/bad `x-revalidate-secret`) · 400 (missing/non-string slug) ·
200 + `revalidateTag(tourTag(slug))`. `route.spec.ts` mocks `next/cache`
`revalidateTag`, drives all four branches. Set/unset `process.env.REVALIDATE_SECRET`
per case (restore in `afterEach`).

**Accept:** `pnpm nx test @tourism/web` green; route returns documented shapes.

### T3 — tag the tour fetches

`apps/web/src/lib/api/tour-detail.ts`: add `next: { tags: [tourTag(slug)] }` to the
`fetchTourReviews` GET and the `fetchTourDetail` `/api/v1/tours/{slug}` GET (init
shape per T0). No behavioural change to the returned view-models — typecheck +
existing tour-detail tests stay green.

**Accept:** `pnpm nx typecheck @tourism/web` + `test @tourism/web` green.

### T4 — API `WebRevalidationService` + config

1. `configuration.ts`: add `revalidateConfig = registerAs('revalidate', () => ({
   secret: process.env.REVALIDATE_SECRET || undefined }))`; push to
   `configurations`. `env.validation.ts`: `REVALIDATE_SECRET:
   Joi.string().allow('').optional()`.
2. `apps/api/src/modules/reviews/web-revalidation.service.ts`: `revalidateTour(slug)`
   per spec (no-op when secret unset; POST with `x-revalidate-secret` +
   `AbortSignal.timeout(3000)`; warn+swallow on `!ok`/throw).
3. `web-revalidation.service.spec.ts`: mock global `fetch` + `ConfigService`;
   assert no-op-when-unset, correct URL/header/body when set, swallow-on-failure.

**Accept:** `pnpm nx test @tourism/api` green for the new spec; `env.validation.spec.ts`
still green (optional var adds no required-field break).

### T5 — hook `moderateById`

`reviews.module.ts`: add `WebRevalidationService` to providers. `reviews.service.ts`:
inject it; widen the `existing` select to include `tour: { select: { slug: true } }`;
after the `$transaction`, `if (existing.isApproved !== isApproved && existing.tour?.slug)
void this.revalidator.revalidateTour(existing.tour.slug)`. Extend
`reviews.service.spec.ts`: provide a mock revalidator; assert called on
false→true + true→false, not on no-op same-value, not for CURATED (no slug), and
that a rejected `revalidateTour` does not fail `moderateById`.

**Accept:** `pnpm nx test @tourism/api` green; existing moderation/email-enqueue
assertions unchanged.

### T6 — env docs

Add `REVALIDATE_SECRET` to `apps/api/.env.example` and `apps/web/.env.example`
with a one-line note (shared secret; API attaches, web validates; unset ⇒
revalidation disabled, 300s ISR backstop). Reference-doc sweep (functions-admin /
backend/frontend env notes) happens at T7/merge per rule 9.

**Accept:** grep shows the var in both `.env.example` files.

### T7 — gate + review

Kill orphan node first (standing rule), then
`pnpm nx affected -t lint typecheck test build`. Then
`superpowers:requesting-code-review` (money-path-adjacent moderation → careful
pass on the post-commit ordering + graceful-degradation). Report test-count delta
(web + api baselines) to the user. **STOP before any merge/push.**

**Accept:** gate green; review clean; report delivered.

## Post-merge (rule 9 — not part of this branch's code tasks)

CHANGELOG entry (date · hash · what shipped · review findings · test baselines) ·
CLAUDE.md api + web rows (revalidation note) · HANDOFF · roadmap cell ·
`docs/03-reference` env/reference touch-points. Owner to-do: set a matching
`REVALIDATE_SECRET` in both the Render (API) and Vercel (web) environments.
