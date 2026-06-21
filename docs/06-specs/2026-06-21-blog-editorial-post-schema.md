# Spec — Editorial Blog (`Post`) schema & feature

**Date:** 2026-06-21 · **Status:** **Backend DONE** (`feat/blog-post-backend`) — schema +
migration + RLS + Posts API (public reads / admin CRUD) + 9 tests; reset/seed cover `posts`;
homepage "Travel guides" teaser added (placeholder, wires to `GET /posts?limit=3`).
**Remaining:** admin authoring UI · web `/blog` + `/blog/[slug]` · wire teaser to live API · regen
OpenAPI client · doc sweep (data-model, function catalogs).
**Owner phase:** "P-Content".

> Captured while designing the P3 homepage. The homepage **"Travel guides" section is intentionally
> NOT built yet** — per the project rule *no dead sections*, it lands only once the API below exists.

## Decision: editorial (agency-authored), NOT user-generated

We add an **editorial** blog — articles written by staff/admins (travel guides, tips, destination
deep-dives), exactly like the reference site's "Travel Advice". We do **not** build user-generated
content (UGC).

**Why editorial:**

- **SEO is the payoff for travel** — guide content ranks for high-intent queries ("things to do in
  Hà Nội", "best time to visit Hạ Long") → top-of-funnel traffic → bookings. This is the core reason
  to have a blog at all.
- **Authority / inspiration** — builds trust, matches the boutique-DMC positioning.
- **Fits our architecture** — author = admin `User`; cover = `MediaAsset`; visibility via the existing
  RLS pattern (public reads published, admin writes). No new moderation surface.

**Why not UGC:**

- **Overlaps `Review`** — travellers already share experience at the tour level (P1.7).
- **Disproportionate cost** — moderation, spam/abuse handling, reporting, edit/delete ownership,
  rate-limiting, and content liability — high ongoing burden for low marginal value over reviews.

## Data model (Prisma)

```prisma
enum PostStatus {
  DRAFT
  PUBLISHED
}

model Post {
  id          String     @id @default(uuid()) @db.Uuid
  slug        String     @unique @db.VarChar(80)
  title       String     @db.VarChar(160)
  excerpt     String?    @db.VarChar(300)
  content     String     // markdown → text (rendered sanitized; never dangerouslySetInnerHTML raw)
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?  @map("published_at")
  authorId    String     @map("author_id") @db.Uuid
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  author User @relation(fields: [authorId], references: [id], onDelete: Restrict)

  @@index([status, publishedAt])
  @@index([authorId])
  @@map("posts")
}
```

- **Reuse:** `User` (author, admin). **Cover/inline media is polymorphic** — `MediaAsset(ownerType=POST,
  ownerId=post.id, role=hero/gallery)`, matching the project's no-FK media pattern (so **no `coverId`
  column**; just add `POST` to `MediaOwnerType`).
- **v1 taxonomy:** keep simple — no categories/tags initially (add `PostTag`/`tags String[]` later if
  SEO needs it). YAGNI until proven.

## RLS (as implemented)

- Table **RLS enabled, default-deny, no policies** — matches `hardening.sql`. The API connects with the
  Supabase **service role (bypasses RLS)**, so access is enforced in NestJS: the public endpoints return
  only `PUBLISHED` + `publishedAt <= now()`; writes are gated by `@Roles(ADMIN)`.

## API (NestJS, standard envelope)

- `GET /posts` — published, paginated (`page`/`limit`, meta), newest first. (optional `?q=` later)
- `GET /posts/:slug` — single published post.
- `GET /admin/posts`, `GET /admin/posts/:slug`, `POST /admin/posts`, `PATCH /admin/posts/:slug`,
  `DELETE /admin/posts/:slug` — admin (author taken from the JWT).
- Slugs auto-generated from title (uniqueness-checked); `publishedAt` set on first publish.

## Admin authoring (`@tourism/admin`)

- List (status filter) + create/edit form: title, auto-slug (editable), excerpt, **content (markdown
  editor)**, cover upload (→ MediaAsset), status toggle (draft/publish). Reuse existing admin CRUD +
  envelope + Supabase auth patterns.

## Frontend (`@tourism/web`) — only after the API ships

- `/blog` — list (card grid, paginated): cover + title + excerpt + date + author.
- `/blog/[slug]` — article: cover, title, meta, **sanitized markdown render**, related posts, enquiry CTA.
- **Homepage "Travel guides" section** — 3 latest published posts (card grid). *Build now-deferred;*
  reuse the card pattern from the existing block library. Wire to `GET /posts?limit=3`.

## Content rendering (security)

- Store **markdown**; render with a vetted markdown renderer that **sanitizes output**. Never
  `dangerouslySetInnerHTML` with unsanitized HTML (web security rule).

## Out of scope (v1)

- Comments, reactions, UGC/guest authoring, multi-author editorial workflow, scheduling beyond a single
  `publishedAt`, i18n of posts (EN-only, ADR-0005).

## Build order (when the phase runs)

1. Schema + migration + RLS (+ `MediaOwnerType.POST`).
2. API (public read + admin CRUD) + tests (≥80% on logic).
3. Admin authoring UI.
4. Web `/blog` + `/blog/[slug]`.
5. Homepage "Travel guides" section (wire `GET /posts?limit=3`).
6. Regenerate FE OpenAPI client; seed a few demo posts.

## Out of scope of *this doc*

Implementation. This spec is the shared mental model; the phase gets its own plan when scheduled.
