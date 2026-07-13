# Blog content enrichment — design spec

**Date:** 2026-07-13 · **Scope:** apps/api fixtures + one refresh script (no
schema change, no FE change) · **Status:** approved (user 2026-07-12/13:
Journal reads short/shallow — diagnosis showed avg 27 words/post; enrich the
seed content; clear structure required — headings, sections, full layout).

## Problem

The 10 seeded posts average **27 words**, 1–2 headings, 0 inline images. The
reader UI (outline rail · scroll progress · reading time · typeset · inline
body images · related tours) is built for long-form and can't activate.

## Deliverables

1. **`apps/api/prisma/fixtures/post-content.cjs` (new)** — a
   `{ [slug]: { content, metaTitle, metaDescription } }` map holding 10
   long-form EN articles (~800–1,200 words each). Required structure per
   article (user requirement 2026-07-13): intro paragraphs (no h1 — titles
   render from `Post.title`; h1 in markdown normalizes to h2 anyway) ·
   **4–6 `##` sections with `###` subsections where natural** · at least one
   list and one blockquote/tip per article · **1–3 inline images** ·
   a closing section that hands off to tours (the related-tours shelf follows
   it). Voice: Nexora — warm, concrete, trust-forward, first-hand; EN-only
   (ADR-0005); straight quotes except Vietnamese diacritics in place names.
2. **Inline images** reuse ONLY Cloudinary URLs already present in
   `fixtures/json/mediaAssets.json` (they exist in the team account and are
   synced live) — topically matched via the owning tour/destination/post;
   normal markdown `![alt](url)` (renderer lazy-loads; typeset styles them).
   No new uploads, no body-image registration (assets stay owned by their
   current owners; acceptable coupling, documented here).
3. **`gen.cjs` wiring** — postDefs keep slug/title/excerpt/status/author/
   dates; `content` comes from the new module (fallback to the old stub if a
   slug is missing = fail the build instead, validation below). New columns
   `metaTitle` (≤70) + `metaDescription` (≤160) added to the generated rows +
   the varchar-cap validator + regenerated `sample-data.ts` and `json/`.
   The `choosing-a-halong-cruise` boundary fixture keeps its fillTo(160/300)
   title/excerpt (deliberate boundary test) — only its content/meta enrich.
4. **`apps/api/prisma/refresh-post-content.ts` (new)** — one-off updater in
   the reset/seed style (DIRECT_URL, dotenv): for each slug, `update` the
   live row's `content`/`excerpt?`/`metaTitle`/`metaDescription` (excerpts
   stay as-is — they're already good copy). Idempotent; skips slugs not in
   DB; prints a per-slug summary. Run against live ONLY after user confirm
   (same ritual as migrations). Wired as an nx target `refresh-posts`.

## Non-goals

FE changes (reader already supports everything) · new media uploads ·
DRAFT→PUBLISHED status changes (the 3 DRAFT posts stay draft — they exercise
admin authoring) · Vietnamese content (ADR-0005).

## Testing / verification

- `node apps/api/prisma/fixtures/gen.cjs` regenerates + self-validates (FK/
  unique/enum/varchar incl. the new meta caps); fixture-consuming api tests
  stay green (`pnpm nx test @tourism/api`).
- Word-count assertion in review: every article 700+ words, ≥4 h2, ≥1 image,
  ≥1 list; every inline image URL exists in mediaAssets.json.
- Gate + adversarial-lite review (content QA: structure per the user
  requirement, voice, factual sanity for Vietnam travel claims, image-topic
  match) → report → user confirms → merge → run refresh script on live →
  changelog + sweep.

## Definition of done

`/blog` articles read as real long-form (outline rail populated, reading
time > 1 min, inline imagery), fixtures regenerate the same content for fresh
environments, live DB updated via the refresh script, gate green, docs swept.
