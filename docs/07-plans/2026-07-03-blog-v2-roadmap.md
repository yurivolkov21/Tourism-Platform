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
- [ ] Wave 3 — admin inline images
- [ ] Wave 4 — reader polish + P6 fast-follows
- [ ] Wave 5 — newsletter + RSS
