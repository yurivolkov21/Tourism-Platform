# Generalized On-Demand Revalidation · implementation plan

**Spec:** [../06-specs/2026-07-17-generalized-ondemand-revalidation-design.md](../06-specs/2026-07-17-generalized-ondemand-revalidation-design.md)
**Branch:** `feat/generalized-ondemand-revalidation`

Dependency-ordered. TDD on pure logic (tag builders, allow-list validation,
trigger wiring assertions). Revalidation is **post-commit + fire-and-forget** —
a bust failure must never affect a mutation. `/gate` before green.

## Tasks

1. **Tag taxonomy module** — `apps/web/src/lib/revalidate.ts`: export tag
   constants (`SITE_MEDIA`, `TOURS`, `DESTINATIONS`, `POSTS`, `CATEGORIES`,
   `FEATURED_REVIEWS`, `TRUST_STATS`) + builders `tourTag(slug)` (exists),
   `postTag(slug)`, and an `isAllowedTag(tag)` validator (constants + `tour:*`/
   `post:*` prefixes). ✅ `revalidate.spec.ts`: builders + validator (valid,
   unknown, prefix, empty).

2. **Generalize `/api/revalidate` route** — `apps/web/src/app/api/revalidate/route.ts`:
   accept `{ tags?: string[]; paths?: string[] }`, keep legacy `{ slug }` →
   `tour:<slug>`. Validate each tag with `isAllowedTag` (unknown → 400); allow-list
   paths conservatively. `revalidateTag(tag, { expire: 0 })` / `revalidatePath`.
   Keep secret check (unset → 503, bad → 401). Return `{ revalidated }`.
   ✅ route spec: no secret → 503; bad secret → 401; unknown tag → 400; valid tags
   → 200 + revalidated list; legacy slug still works.

3. **Tag public fetches** — add `next: { tags }` per spec §2:
   `getSiteMedia`→`site-media`; `fetchTourCards`/counts→`tours`;
   `fetchDestinationTiles`/`fetchRegionBookables`/counts→`destinations`;
   `fetchPosts`/`fetchPostTags`→`posts`; `fetchPost`→`post:<slug>`;
   `fetchActiveCategories`→`categories`; `fetchFeaturedReviews`→`featured-reviews`;
   `fetchTrustStats`/`reviewSummary`/`count`→`trust-stats`. (Tour detail already
   tagged.) ✅ `nx typecheck @tourism/web`; no behavior change without a bust.

4. **Fix sharp gaps** — `apps/web/src/app/blog/page.tsx`: add
   `export const revalidate = 300` + ensure its fetches carry `posts`. Lower
   `fetchActiveCategories` timer 3600→300. ✅ blog list regenerates; no build error.

5. **Extend `WebRevalidationService`** — `apps/api/src/modules/reviews/web-revalidation.service.ts`
   (consider relocating to a shared `common`/`revalidation` module since it now
   serves many modules): add `revalidateTags(tags: string[])` (POST `{ tags }`,
   ~3s timeout, fire-and-forget, no-op when `REVALIDATE_SECRET`/`FRONTEND_URL`
   unset, swallow + log errors). Keep `revalidateTour(slug)` as a wrapper.
   ✅ spec: builds correct payload/headers; unset config → no-op; error swallowed.

6. **Wire post-commit triggers** — after DB commit in each mutating service, call
   `revalidateTags(...)` per spec §4:
   - Tours (`tours.service`): create/update/publish/unpublish/delete →
     `[TOURS, tourTag(slug), TRUST_STATS]`.
   - Departures (`departures.service`): create/update/delete → `[tourTag(slug)]`.
   - Site-media (`site-media.service`): set/clear slot → `[SITE_MEDIA]`.
   - Posts (`posts.service`): create/update/publish/unpublish/delete →
     `[POSTS, postTag(slug)]`.
   - Destinations (`destinations.service`): create/update/delete → `[DESTINATIONS]`.
   - Categories (`categories.service`): create/update/delete → `[CATEGORIES]`.
   - Reviews (`reviews.service`): keep approve/unapprove → add `[TRUST_STATS]`
     alongside existing `tour:<slug>`; setFeatured/unfeature → `[FEATURED_REVIEWS]`.
   Inject the service where missing; register providers/exports as needed.
   ✅ per-service spec: each mutation invokes the revalidator with the expected
   tags (mock the service); mutation still succeeds if the bust throws.

7. **Gate + manual verify** — `pnpm nx run-many -t lint typecheck test build
   --projects=@tourism/web,@tourism/api`. Manual: edit Hero slot → homepage fresh
   next request; publish a tour/post → public page fresh in seconds; `/blog` shows
   a new post without redeploy; unset `REVALIDATE_SECRET` → falls back to timer,
   nothing breaks. ✅ green.

8. **Docs sweep + PR** — one `docs/CHANGELOG.md` entry; update
   `docs/03-reference/functions-*.md` (revalidate endpoint contract) +
   `frontend.md`/`backend.md` (tagged fetches + triggers); consider a new ADR for
   the "API-driven web revalidation" idiom. Conventional Commits, no AI
   attribution. Push, PR, **pause for review** → rebase-merge + delete branch.

## Sequencing

1 (taxonomy) → 2 (endpoint) → 3 (tag fetches) → 4 (gap fixes) → 5 (service) →
6 (triggers) → 7 (gate + verify) → 8 (PR). Steps 1–2 are the contract both sides
depend on; 3–4 are web-only and can land in parallel with 5; 6 needs 5.

## Reused seams

Existing `POST /api/revalidate` route, `WebRevalidationService`, `lib/revalidate.ts`
`tourTag`, and the reviews→revalidate wiring (the template for all other triggers).
`REVALIDATE_SECRET` + `FRONTEND_URL` env already exist for the reviews path.

## Deferred / follow-ups

- Redis / app-level API response caching (separate layer, not needed here).
- Fine-grained per-entity tags beyond the coarse taxonomy (only if recompute cost
  proves material).
- Self-hosted multi-instance shared cache handler (N/A on Vercel).

## Verification (adversarial — money-path safety)

Confirm every trigger is **outside** the Prisma transaction and fire-and-forget:
a thrown/timed-out revalidation must leave the booking/refund/tour write committed
and the response unaffected. The ISR backstop (≤300s) covers any dropped bust.
