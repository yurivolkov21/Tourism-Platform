# Review on-demand revalidation — design spec

**Date:** 2026-07-16 · **Scope:** `@tourism/api` + `@tourism/web` · **Status:** APPROVED (design signed off 2026-07-16; docs written for the record)

## Goal & Scope

When an admin approves (or un-approves) a customer review, the change must show
on the **public web tour detail page within seconds**, not after the passive
5-minute ISR timer. Do this **without** making the tour page fully dynamic — keep
ISR so the free API tier isn't hit per request. Use Next.js **on-demand
revalidation** (`revalidateTag`), triggered cross-app by the NestJS API after the
moderation commits.

### Root cause (confirmed — not re-litigated)

Not a data/logic bug. Approval and the public read agree on the visibility gate
(`isApproved:true` + tour `isPublished:true`). The staleness is **web caching**:
`apps/web/src/app/tours/[slug]/page.tsx` is statically prerendered with
`export const revalidate = 300`, and the reviews/detail fetches
(`apps/web/src/lib/api/tour-detail.ts`) are **untagged**, so they freeze into the
static output and only refresh on the 300s timer. Admin is a separate Next app,
and no `revalidateTag`/`revalidatePath` exists for `/tours/[slug]` anywhere.

### Locked decisions (from brainstorming, 2026-07-16)

1. **Trigger point = post-commit in `ReviewsService.moderateById`**, not the
   outbox dispatch. The outbox path was the brief's first instinct but the code
   disqualifies it: the drain runs on a **1-minute cron** (`jobs.service.ts`),
   is **entirely disabled when `RESEND_API_KEY` is unset** (and in `test`), and
   **never fires on un-approve** (true→false enqueues no outbox row). A
   fire-and-forget call placed after the awaited `$transaction` is also
   post-commit, but immediate, email-independent, and covers **both**
   transitions.
2. **Fire on any `isApproved` change** (false→true AND true→false), skipped for
   CURATED reviews (no linked tour/slug).
3. **Reuse the existing required `FRONTEND_URL`** as the web origin the API POSTs
   to — no separate web-URL env. The **only new env is a single shared
   `REVALIDATE_SECRET`** (API attaches it, web validates it).
4. **Cache tag = `tour:${slug}`**, applied to BOTH the reviews fetch and the
   `/tours/{slug}` detail fetch — approving a review also changes
   `averageRating`/`reviewsCount` on the detail DTO, so the header stars must
   refresh with the list. One `revalidateTag('tour:'+slug)` busts both.
5. **Graceful degradation** (mirrors the optional chat-key posture): API secret
   unset ⇒ revalidator no-ops; any HTTP failure is logged and swallowed;
   moderation always succeeds; the 300s ISR remains the backstop.

### Out of scope (noted as follow-ups)

- Homepage featured-carousel revalidation when `isFeatured` changes.
- The `pageSize:9` reviews cap with no pagination on the public detail page.
- Admin app has no public cache to revalidate — no admin changes.

## Design

### Data flow

```
Admin approves review
  → API PATCH /reviews/:id/moderation → ReviewsService.moderateById
      → $transaction { update isApproved (+audit); enqueue REVIEW_APPROVED on false→true }  ← commits
      → if isApproved changed AND review.tour.slug exists:
           void WebRevalidationService.revalidateTour(slug)   (fire-and-forget)
               → POST ${FRONTEND_URL}/api/revalidate
                    header x-revalidate-secret: <REVALIDATE_SECRET>, body { slug }
  → web route handler validates secret → revalidateTag(`tour:${slug}`)
  → next request to /tours/[slug] regenerates the tagged fetches (reviews + detail)
```

### API — `apps/api`

**`WebRevalidationService`** (new, provided in `ReviewsModule`):
- Constructor reads `app.frontendUrl` (required) + `revalidate.secret` (optional)
  from `ConfigService`.
- `revalidateTour(slug: string): Promise<void>` — if `secret` is unset, debug-log
  and return (no-op). Otherwise `fetch(`${frontendUrl}/api/revalidate`, { method:
  'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret':
  secret }, body: JSON.stringify({ slug }), signal: AbortSignal.timeout(3000) })`.
  Non-2xx or throw ⇒ `logger.warn` and swallow (never rethrows). Global `fetch`
  (Node 22) — no new dependency.

**`ReviewsService.moderateById`** ([reviews.service.ts:410](../../apps/api/src/modules/reviews/reviews.service.ts#L410)):
- Extend the `existing` select from `{ id, isApproved }` to also include
  `tour: { select: { slug: true } }`.
- After the `$transaction` resolves, if `existing.isApproved !== isApproved` and
  `existing.tour?.slug` is set, call `void this.revalidator.revalidateTour(slug)`.
  Placed after the awaited transaction ⇒ post-commit; `void` + the service's own
  try/catch ⇒ never blocks or fails moderation.

**Config / env:**
- New namespace `revalidateConfig = registerAs('revalidate', () => ({ secret:
  process.env.REVALIDATE_SECRET || undefined }))` in `configuration.ts`, added to
  the `configurations` array.
- Joi: `REVALIDATE_SECRET: Joi.string().allow('').optional()` in
  `env.validation.ts` (optional — unset ⇒ no-op, same pattern as
  `ANTHROPIC_API_KEY`).

### Web — `apps/web`

**Tag the reads** (`apps/web/src/lib/api/tour-detail.ts`):
- `fetchTourReviews(slug)` and `fetchTourDetail`'s `/api/v1/tours/{slug}` GET each
  pass `next: { tags: [tourTag(slug)] }` as request init. `openapi-fetch` forwards
  unknown init keys to `fetch`, and Next augments `fetch` with `next.tags`. (Exact
  Next 16 shape confirmed via context7 before coding.)
- Note the interaction with React `cache()` on `fetchTourDetail`: `cache()` only
  dedupes within one render pass; the Next Data Cache (where tags live) is the
  layer `revalidateTag` targets, so tagging the underlying fetch is correct.

**Revalidation route** (`apps/web/src/app/api/revalidate/route.ts`, new):
- `export const runtime = 'nodejs'` (default) — server-only, uncached.
- `POST`: read `REVALIDATE_SECRET` from `process.env`. If unset ⇒ 503
  (misconfig, visible). Read `x-revalidate-secret` header; validate with
  `isValidRevalidateSecret`. Mismatch/missing ⇒ 401. Parse `{ slug }`; missing/
  non-string ⇒ 400. On success `revalidateTag(tourTag(slug), { expire: 0 })` and
  return `{ revalidated: true, tag }` 200. Wrap body parse in try/catch → 400.
  `{ expire: 0 }` = immediate expiry (blocking miss on the next request) rather
  than the `'max'` stale-while-revalidate profile, since this webhook-style
  trigger needs the change visible on the admin's very next reload.

**Pure logic (TDD)** — `apps/web/src/lib/revalidate.ts` (+ `.spec.ts`):

| Function | Contract |
| --- | --- |
| `tourTag(slug)` | `` `tour:${slug}` `` — single source for tagging + revalidating. |
| `isValidRevalidateSecret(provided, expected)` | `false` when either is empty/nullish or lengths differ; else constant-time char-code XOR compare. Pure (no `node:crypto`) so it is safe to co-locate and unit-test. |

### Testing

- `apps/web/src/lib/revalidate.spec.ts` (test-first): `tourTag` format;
  `isValidRevalidateSecret` — empty provided, empty expected, both empty, wrong
  length, one-char-off, exact match.
- `apps/web/src/app/api/revalidate/route.spec.ts`: 503 when server secret unset;
  401 on missing/bad header; 400 on missing slug; 200 + `revalidateTag` called
  with `tour:<slug>` on good secret. Mock `next/cache` `revalidateTag`.
- API `web-revalidation.service.spec.ts`: no-op (no fetch, debug log) when secret
  unset; POSTs to `${frontendUrl}/api/revalidate` with header + `{ slug }` body
  when set; swallows a rejected/`!ok` fetch (resolves, warns, never throws).
- API `reviews.service.spec.ts` (extend): revalidator called on false→true and
  true→false; NOT called on a same-value no-op write; NOT called for a CURATED
  review (no `tour.slug`); a revalidator rejection does not fail `moderateById`.

### Planned files

| File | Change |
| --- | --- |
| `apps/web/src/lib/revalidate.ts` (+ `.spec.ts`) | new — `tourTag`, `isValidRevalidateSecret` |
| `apps/web/src/app/api/revalidate/route.ts` (+ `.spec.ts`) | new — secret-guarded POST → `revalidateTag` |
| `apps/web/src/lib/api/tour-detail.ts` | tag the reviews + detail fetches with `tourTag(slug)` |
| `apps/api/src/modules/reviews/web-revalidation.service.ts` (+ `.spec.ts`) | new — cross-app POST |
| `apps/api/src/modules/reviews/reviews.module.ts` | provide `WebRevalidationService` |
| `apps/api/src/modules/reviews/reviews.service.ts` (+ spec) | inject revalidator; hook post-commit; widen `existing` select |
| `apps/api/src/config/configuration.ts` · `env.validation.ts` | `revalidate.secret` + Joi (optional) |
| `apps/api/.env.example` · `apps/web/.env.example` | document `REVALIDATE_SECRET` |
| `docs/03-reference/*` · `docs/CHANGELOG.md` | docs sweep on merge (rule 9) |

### Risks

- **openapi-fetch × `next.tags` passthrough:** if init keys are not forwarded,
  fall back to tagging via a thin `fetch` wrapper passed to `createApiClient`.
  Confirmed against context7 + a typecheck before relying on it.
- **Cross-app secret drift:** API and web must share the same `REVALIDATE_SECRET`
  in Vercel/Render. Mismatch ⇒ 401 logged on both sides; 300s ISR still backstops.
- **Env unset in current deploys:** shipping before the secret exists is safe —
  API no-ops, web route 503s (never called), page behaves exactly as today.
