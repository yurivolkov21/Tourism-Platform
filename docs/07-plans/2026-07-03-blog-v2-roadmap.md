# Blog v2 roadmap — from reader to full editorial system

- **Date:** 2026-07-03
- **Status:** approved direction (user 2026-07-03) — waves execute one at a time
- **Context:** P6 shipped the blog reader (`/blog` + `/blog/[slug]` + home teaser + SEO). User
  review on the live deploy: the reader renders fine but a *complete* blog needs taxonomy,
  a sales funnel, richer authoring, reader polish, and channel infra. This roadmap covers all
  four analysis groups (A taxonomy · B funnel · C authoring · D polish + infra).
- **Process per wave (same as the admin enrichment roadmap):** brainstorm the wave's open
  design questions with the user (when any) → spec in `docs/06-specs/` → plan in
  `docs/07-plans/` → SDD (haiku transcription / sonnet reasoning + all reviewers;
  `ecc:code-reviewer` for slices with BE) → gate
  (`pnpm nx affected -t lint test build --exclude=@tourism/mobile`) → merge per green slice
  (pre-authorized) → docs + memory. **Migrations on the live Supabase DB always get an
  explicit user go/no-go before `migrate deploy`.** Regen types after any BE DTO change.

## Locked decisions (user, 2026-07-03)

1. **Tags = free-form, created inline** — `PostTag` model (slug unique), admin post form gets
   a combobox (suggest existing + create new). No standalone Tags CRUD page.
2. **Related tours = admin hand-picked per post** (M:N Post↔Tour, 1–3 tours). Auto-match by
   tag/destination is a possible later fallback, NOT in scope now.
3. **Byline = real author** — public `PostDto` gains `author { fullName, avatarUrl }`
   (never email). Brand-team byline remains only as the missing-author fallback.
4. **Newsletter = DB-backed lead capture** — `Subscriber` model + public subscribe endpoint +
   admin list/export. No external provider.

## Wave 1 — Content model: tags + tour links + author (BE-heavy)

- Prisma: `PostTag` (id, slug unique, name) + Post↔PostTag M:N + Post↔Tour M:N.
  **ONE migration covers both relations** (Wave 2 then needs zero schema work).
- Public `PostDto` += `tags[] { slug, name }` + `author { fullName, avatarUrl }` (no email).
- Admin write path: create/update accept `tags: string[]` (names; service upserts by slug)
  and `relatedTourSlugs: string[]`; admin detail DTO returns both.
- Admin post form: tag combobox (suggest + create inline) + tour multi-picker (published
  tours). Admin post detail/list surface tags.
- Regen `@tourism/core` types; deploy-lag guards on every new field FE-side.
- Gate: user go/no-go before applying the migration to live Supabase.

## Wave 2 — Reader funnel + taxonomy UX (web FE, zero schema)

- Article footer: **"Tours in this story"** block (hand-picked tours via Wave 1 data, reuse
  `TourCard`/`TourTile`) + `EnquiryCta` (prefill from post title) — no more dead-end articles.
- Byline → real author (avatar + name; fallback "By the Nexora team" when author absent —
  deploy-lag guard doubles as the fallback path).
- "More from the journal" → **related-by-tag** (posts sharing tags, newest first; fallback to
  recency when not enough tag-mates).
- `/blog`: tag filter chips (`?tag=`) + **search box** (`?q=` — BE `search` param already
  exists) ; tag chips on cards + article header.

## Wave 3 — Admin authoring: inline images (BE small + admin FE)

- `UploadPurpose.POST_BODY` + "Insert image" on the post form: sign → upload Cloudinary →
  insert `![alt](url)` at the textarea cursor; live markdown preview beside the editor.
- **Design question to settle in this wave's brainstorm:** are body images tracked as
  POST-owned `MediaAsset` rows? The current `PUT media` is replace-all and would
  garbage-collect body images not re-submitted with the cover. Options: separate role kept
  out of replace-all · parse markdown refs on save · untracked uploads (no GC). Decide with
  the user before speccing.

## Wave 4 — Reader polish (web FE-only, cheap)

- Prev/next post navigation at article end.
- Share row: copy link + Facebook + X (no SDKs).
- Outline rail **scrollspy** (highlight active section) + `ScrollProgress` bar (component
  already in `@tourism/ui`, tour detail uses it).
- "Updated on …" when `updatedAt` meaningfully post-dates `publishedAt`.
- **Folds in the P6 fast-follows** (same files): outline-anchor mismatch when a heading
  contains a markdown link/inline code (strip markdown before `slugifyHeading` in
  `extractOutline`) + extract shared `stripMarkdownSyntax` (DRY `readingStats`/`fallbackExcerpt`).

## Wave 5 — Newsletter + RSS (BE small + FE)

- `Subscriber` model (email unique, subscribedAt, source?) — own migration (go/no-go).
- `POST /newsletter/subscribe` public: rate-limited, silent dedupe (no email-exists oracle).
- Footer form wired for real (loading + success toast; today it is `action="#"`).
- Admin: Subscribers list (+ CSV export) under Operations.
- RSS `/blog/rss.xml` (route handler, ISR-cadence, mirrors the sitemap fetch pattern).

## Not code, but load-bearing

- **Real content**: the fixture posts are ~1-min reads with no covers — no feature fixes
  that. After Wave 1 the user can author real posts (with tags + covers) in admin; after
  Wave 3, with inline images. Recommended to start replacing fixtures as soon as Wave 1 lands.

## Out of scope (deliberate)

Comments (moderation cost > value for an agency blog) · auto related-tours matching
(fallback idea only) · external email providers · post scheduling UI (BE already publishes by
`publishedAt <= now`) · i18n beyond EN.

## STATUS

- [x] Wave 1 — content model (tags + tour links + author) — **DONE 2026-07-03** (slice 1 BE
  merged `83d0151`, migration applied live w/ user GO; slice 2 admin UI merged `2f2193e`;
  api 301 / admin 139 tests; fast-follows in the wave plan's STATUS)
- [x] Wave 2 — reader funnel + taxonomy UX — **DONE 2026-07-03** (merged `b263e32`; web 155
  tests; final review 1 must-fix applied pre-merge; notes in the wave plan's STATUS)
- [x] Wave 3 — admin inline images — **DONE 2026-07-05** (slice 1 BE merged `96e9ff1`,
  migration applied live w/ user GO; slice 2 admin UI merged `335a60f` fast-forward;
  api 309 / admin 142 tests; notes in the wave plan's STATUS)
- [x] Wave 4 — reader polish + P6 fast-follows — **DONE 2026-07-05** (merged `b9b5158`
  fast-forward; web 175 tests; outline-anchor + stripMarkdownSyntax fast-follows landed;
  notes in `docs/07-plans/2026-07-05-blog-v2-wave4-reader-polish.md` STATUS)
- [x] Wave 5 — newsletter + RSS — **DONE 2026-07-05** (slice 1 BE merged `15c5cb4`,
  migration applied live w/ user GO + registerAsset unique-index fast-follow; slice 2 FE
  merged `a91909d`; api 314 / web 182 / admin 146 tests; notes in
  `docs/07-plans/2026-07-05-blog-v2-wave5-newsletter-rss.md` STATUS)

**→ blog-v2 roadmap COMPLETE (2026-07-05): all 5 waves merged to `main`.**

## RESUME STATE (written 2026-07-03 — authoritative handoff, survives machine loss)

> If local Claude memory / `.superpowers/` scratch is gone (new machine, factory reset),
> THIS section + git log + the wave plans' STATUS blocks are the full picture. Local env
> files are NOT in git — restore per `docs/05-runbooks/env-and-secrets.md` before running
> anything.

**Where things stand:**

1. **Waves 1 + 2 = DONE and on `main`** (merged `2f2193e`, `b263e32` + docs commits).
   Wave-1 migration `20260703120425_add_post_tags_and_post_tours` IS applied to the live
   Supabase DB. Test baselines: api **314** · admin **146** · web **182**.
2. **Wave 3 = DONE and on `main`** — slice 1 (BE) merged `96e9ff1` (2026-07-03), migration
   `20260703144308_add_media_role_body` applied live (user GO, before merge),
   `ecc:code-reviewer` APPROVE-WITH-NOTES (LOW fast-follow: `registerAsset`
   findFirst-then-create benign duplicate race — add a unique index or upsert later);
   slice 2 (admin editor UI) merged `335a60f` fast-forward (2026-07-05), admin **142**
   tests, deviations noted in the wave plan's STATUS (notably: body-image registration is
   a `registerBodyImage` server action in `apps/admin/src/lib/uploads.ts` — `apiWrite` is
   server-only and cannot be imported by client components).
3. **Wave 4 = DONE and on `main`** — merged `b9b5158` fast-forward (2026-07-05,
   user-reviewed). web **175** tests. Spec/plan:
   `docs/06-specs/2026-07-05-blog-v2-wave4-reader-polish-design.md` +
   `docs/07-plans/2026-07-05-blog-v2-wave4-reader-polish.md`. The P6 fast-follows
   (outline-anchor markdown mismatch, `stripMarkdownSyntax` DRY) landed with it.
4. **Wave 5 = DONE and on `main` → blog-v2 roadmap COMPLETE.** Slice 1 (BE) merged
   `15c5cb4`: `Subscriber` model, migration
   `20260705012606_add_subscribers_and_media_asset_unique` applied live (user GO before
   merge; also carried the W3 `registerAsset` unique-index/upsert fast-follow),
   `POST /newsletter/subscribe` (throttled, honeypot, silent dedupe) +
   `GET /admin/newsletter/subscribers`. Slice 2 (FE) merged `a91909d`: live footer form
   (browser-side POST, per-IP throttle) · `/blog/rss.xml` · admin `/subscribers` list +
   CSV export (formula-injection-guarded). **NO next blog-v2 action — the roadmap is
   done.** Next work = a new roadmap/phase (user decides; P5 mobile is the teammate's
   lane).
5. **Process:** spec → plan → execute per wave; TDD on pure logic;
   `ecc:code-reviewer` only on BE slices; **merges = user source review, then rebase +
   `--ff-only`** (user preference 2026-07-05 — supersedes the old "pre-authorized
   `--no-ff`" line); migrations ALWAYS user-gated.
6. **Carried fast-follows** live in each wave plan's STATUS block (W1: tag-race 409
   message + stale controller return types + prisma format — still open, LOW; W2: none
   blocking; W3 slice 1: registerAsset dup-race unique-index — ✅ landed in Wave 5;
   P6: outline-anchor md-link mismatch + `stripMarkdownSyntax` DRY — ✅ landed in
   Wave 4).
