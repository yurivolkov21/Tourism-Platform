# Blog content enrichment — implementation plan

**Spec:** `docs/06-specs/2026-07-13-blog-content-enrichment-design.md`
**Branch:** `feat/blog-content-enrichment` · **Scope:** apps/api fixtures + refresh script

**STATUS: 🔨 IN PROGRESS** (started 2026-07-13)

Standing rules: EN-only copy · structure per spec (intro · 4–6 h2 (+h3) ·
list + tip per article · 1–3 inline images from existing fixture URLs ·
tour-handoff close) · straight quotes (diacritics OK in names) · no schema
change · live update only after user confirm · Conventional Commits.

## Tasks

- [ ] T1 — `fixtures/post-content.cjs`: 10 long-form articles per the
      per-post outlines (~800–1,200 words each) + metaTitle ≤70 +
      metaDescription ≤160 per post.
- [ ] T2 — `gen.cjs`: source content/meta from the module (throw on missing
      slug) · add meta varchar caps to the validator · regenerate
      `sample-data.ts` + `json/` · `node gen.cjs` passes self-validation.
- [ ] T3 — `refresh-post-content.ts` + nx target `refresh-posts`
      (reset/seed style; per-slug update summary; idempotent).
- [ ] T4 — Verify: api suite green · content QA checklist (700+ words · ≥4
      h2 · ≥1 list · ≥1 image with URL ∈ mediaAssets.json per article) ·
      gate + format check.
- [ ] T5 — Content review (voice/structure/facts) → report → user confirms →
      merge → run `refresh-posts` on live → changelog entry + sweep
      (frontend.md blog row note; data-model untouched).
