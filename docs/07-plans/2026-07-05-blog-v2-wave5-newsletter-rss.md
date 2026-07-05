# Blog v2 Wave 5 — newsletter + RSS implementation plan

**Goal:** DB-backed newsletter lead capture (public subscribe + admin list/CSV) + RSS
feed, closing the blog-v2 roadmap; carries the W3 `registerAsset` unique-index
fast-follow in the same migration window.

**Spec:** `docs/06-specs/2026-07-05-blog-v2-wave5-newsletter-rss-design.md`.

## Global constraints

- Baselines: api **309** · admin **142** · web **175**. TDD on all pure logic.
- Tokens only, reuse `@tourism/ui`/patterns first, copy via `@tourism/i18n` (EN-only).
- Never reformat unnamed lines; never stage unrelated files; Conventional Commits.
- **Migration gate:** `--create-only`; `prisma migrate deploy` ONLY after the user's GO
  (after the pre-GO dupe check); merge only after the migration is applied.
- Merges: STOP for user source review → rebase + `git merge --ff-only` → push → delete
  branch.
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.

## Reused seams

Enquiry module (throttle/honeypot/ack + module registration) · admin controllers' guard
stack + pagination envelope (`PageMetaDto`) · `getApiClient`/`ServerTablePagination`/
`AdminTableShell` (admin) · enquiry-CTA client-island status pattern +
`messages.footer.newsletter*` (web) · `absoluteUrl` + sitemap fetch pattern (RSS) ·
`fallbackExcerpt` (RSS descriptions are already-plain excerpts) · media.service spec
harness (upsert adaptation).

## Slice 1 — BE (branch `feat/blog-v2-newsletter-be`)

### Task 1 — schema + migration (create-only)

- [ ] `schema.prisma`: add `Subscriber` model (spec §1) + `@@unique([ownerType, ownerId, publicId])`
  on `MediaAsset`.
- [ ] `cd apps/api && pnpm exec prisma migrate dev --create-only --name add_subscribers_and_media_asset_unique`
  then `pnpm exec prisma generate`. Expect CREATE TABLE `subscribers` + CREATE UNIQUE
  INDEX on `media_assets` and NOTHING else (abort on drift/reset prompts — live DB).
- [ ] **Accept:** `pnpm nx run @tourism/api:typecheck` green. Commit
  `feat(api): Subscriber model + media-asset unique index (create-only)`.

### Task 2 — `registerAsset` upsert (TDD)

- [ ] Adapt the two registerAsset specs: idempotent case asserts `upsert` with
  `where: { ownerType_ownerId_publicId: { … } }`, `update: {}`, `create: { …row }`;
  drop the findFirst stubs.
- [ ] Swap findFirst-then-create for the single `upsert`.
- [ ] **Accept:** `pnpm nx test @tourism/api --testPathPatterns=media.service` green.
  Commit `fix(api): registerAsset upsert on compound unique (dup-race fast-follow)`.

### Task 3 — newsletter module (TDD)

- [ ] DTOs (spec §3): `SubscribeDto` (email IsEmail ≤200 · source optional ≤40 ·
  website honeypot optional) · `SubscribeAckDto` · `SubscriberDto` · list query DTO
  mirroring an existing admin list.
- [ ] Failing service specs: `subscribe` lowercases/trims then upserts by email
  (update `{}`) and resolves the same ack for new + duplicate; `list` builds
  `{ contains, mode: 'insensitive' }` where on search, newest-first, `{ data, meta }`.
- [ ] Implement `NewsletterService`; `NewsletterController`
  (`POST /newsletter/subscribe`, `@Public`, controller-local ThrottlerGuard + 5/min
  `@Throttle`, honeypot short-circuit ack — copy the enquiry controller shape);
  `AdminNewsletterController` (`GET /admin/newsletter/subscribers`, standard admin
  guards); register `NewsletterModule` in `app.module.ts`.
- [ ] **Accept:** `pnpm nx run-many -t lint typecheck test -p @tourism/api` green
  (record count; baseline 309 + new). Commit
  `feat(api): newsletter subscribe (public, throttled, silent dedupe) + admin list`.

### Task 4 — regen types + consumers

- [ ] Boot API → `/regen-types` flow (`@tourism/core:api-types`) → kill server. Build
  web + admin + core; run web/admin tests (no consumer narrows on the new schemas).
- [ ] **Accept:** builds green. Commit `chore(core): regen api types - newsletter endpoints`.

### Task 5 — gate + ⛔ MIGRATION GO + user review + merge

- [ ] Gate green vs main.
- [ ] Pre-GO dupe check on live (read-only SQL, spec §Risks). **⛔ STOP — user GO**, then
  `cd apps/api && pnpm exec prisma migrate deploy`.
- [ ] **⛔ STOP — user source review** → rebase + `--ff-only` merge → push → delete branch.

## Slice 2 — FE (branch `feat/blog-v2-newsletter-fe`, cut after slice 1 merges)

### Task 6 — web footer form

- [ ] i18n: `messages.footer` += `newsletterSuccess/newsletterError/newsletterRateLimited/newsletterInvalid`.
- [ ] `lib/newsletter/actions.ts` server action → POST public endpoint (native fetch to
  `NEXT_PUBLIC_API_BASE_URL`, mirror the enquiry action), returns
  `{ ok } | { rateLimited } | { error }`; TDD the pure response-mapping if extracted.
- [ ] `components/marketing/newsletter-form.tsx` client island (same markup/classes as
  the dead form + honeypot + status line) — swap into `site-footer.tsx`.
- [ ] **Accept:** `pnpm nx run-many -t lint test build -p @tourism/web @tourism/i18n` green.

### Task 7 — RSS (TDD on the builder)

- [ ] Failing `lib/blog/rss.spec.ts`: escapes `&<>"'` in title/description · RFC-822
  pubDate passthrough · guid = link · empty items → valid empty channel.
- [ ] `lib/blog/rss.ts: buildRssXml` + `app/blog/rss.xml/route.ts` (`revalidate = 300`,
  error-tolerant fetch, `application/rss+xml`). Blog index metadata gains the
  `alternates.types` RSS link.
- [ ] **Accept:** web tests green (baseline 175 + Task 6/7 additions), build green.

### Task 8 — admin subscribers page + CSV (TDD on toCsv)

- [ ] Failing `lib/subscribers/csv.spec.ts`: quotes fields · doubles inner quotes ·
  guards leading `=+-@` (formula injection) · header row.
- [ ] `lib/subscribers/{csv,data}.ts` · `/subscribers` server page (URL-driven
  `?page&pageSize&q`, `AdminTableShell`, `ServerTablePagination`, Export CSV button) ·
  `subscribers/export/route.ts` (session-authed pass-through, pages until exhausted,
  `text/csv` attachment) · nav entry (Operations, `Mail` icon).
- [ ] **Accept:** `pnpm nx run-many -t lint test build -p @tourism/admin` green
  (baseline 142 + csv cases).

### Task 9 — gate + STOP (user review) + merge + docs

- [ ] Gate vs main. **⛔ STOP — user source review** → rebase + `--ff-only` → push →
  delete branch.
- [ ] Docs: this plan's STATUS · roadmap STATUS + RESUME STATE (blog-v2 COMPLETE) ·
  CLAUDE.md api/web/admin rows · memory.

**Sequencing:** 1→2→3→4→5 strictly ordered (slice 1); 6/7 independent after 5, 8 after 4
(needs regen'd types), 9 last. Commits per task.

## STATUS

- [x] Slice 1 (Tasks 1–5): BE — **DONE**, merged `15c5cb4` fast-forward (2026-07-05,
  user-reviewed). Migration `20260705012606_add_subscribers_and_media_asset_unique`
  APPLIED to live Supabase (user GO before merge; pre-GO dupe check = 0 rows; verified
  post-apply: table + unique index + RLS). api **314** tests. Note: `prisma migrate dev
  --create-only` refuses non-interactive envs — migration generated via
  `prisma migrate diff --from-config-datasource --to-schema … --script` + hand-made
  folder (SQL identical to Prisma's).
- [ ] Slice 2 (Tasks 6–9) — **IN PROGRESS** (branch `feat/blog-v2-newsletter-fe`)
