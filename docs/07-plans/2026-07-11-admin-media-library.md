# Media library upgrade (Wave D1) — implementation plan

**Spec:** `docs/06-specs/2026-07-11-admin-media-library-design.md`
**Branch:** `feat/admin-media-library` · **Scope:** `apps/api` + `apps/admin` + web alt

**STATUS: ✅ COMPLETE** — merged to `main` 2026-07-11 (`1d76c96`, ff-only); `media_asset_alt` migration applied to live Supabase (column verified). Gate green: api 402 · admin 224 · web 232. Adversarial-review fixes as recorded in the previous STATUS note.

Standing rules: TDD-first on services + pure helpers · straight quotes · no
unrelated-line reformatting · tokens only · reuse the crud stack · `noValidate`
forms · kill orphan node before nx runs · adversarial review before merge
(migration + GC) · live migration only after user confirm.

## Tasks

### T1 — API: GC ref-safety (TDD)

- [x] `media.service.spec.ts` first: a publicId still referenced by ANY owner
      is NOT enqueued (syncAssets drop path · deleteForOwner path); an
      unreferenced one still is; poster ids covered.
- [x] `admin-media.service.spec.ts`: single delete routes through the guarded
      helper (referenced publicId → row deleted, garbage NOT enqueued).
- [x] `maintenance.service.spec.ts`: reconcile backstop — referenced →
      garbage row dropped, `cloudinary.destroy` NOT called.
- [x] Implement: shared guarded enqueue in `MediaService` + reconcile check.

### T2 — API: alt column + PATCH + bulk delete (TDD, migration)

- [x] Prisma `MediaAsset.alt String? @db.VarChar(300)` + migration
      `media_asset_alt` (additive; live deploy at merge only).
- [x] Specs first: `syncAssets` stores alt · preserves it when the payload
      omits it on kept rows · `registerAsset` passthrough · `updateAlt`
      (set/clear/404) · `bulkDelete` (mixed batch: ok + USER-owned skipped +
      unknown ignored; ref-checked garbage; single tx).
- [x] DTOs: `MediaInputDto.alt?` (≤300) · `MediaItemDto.alt` ·
      `UpdateMediaAltDto { alt: string | null }` · `BulkDeleteMediaDto
      { ids: uuid[] 1..100 }`; endpoints `PATCH /admin/media/:id` +
      `POST /admin/media/bulk-delete`; `attachToOwners` maps alt.

### T3 — Regen typed client

- [x] Serve API → `pnpm nx run @tourism/core:api-types` → commit.

### T4 — Admin: picker + alt edit + bulk selection

- [x] `lib/media.ts`: round-trip `alt` in `MediaInput`/`assembleMediaSet`/
      `parseMediaField` (TDD the mapper) + pure picker dedupe helper (TDD).
- [x] `MediaField`: "Choose from library" dialog (images-only list via a new
      `listLibraryMedia` server action — search + ownerType facet + paginate,
      select → MediaInput w/ target role; dedupe guard; inline error state).
- [x] Library drawer: alt display + edit form (`noValidate`, ≤300, clear
      allowed) → `updateMediaAlt` action → toast + refresh.
- [x] Library grid: selection checkboxes on tiles + floating "N selected"
      action bar → confirm dialog → `bulkDeleteMedia` action → summary toast
      (deleted/skipped) + refresh; selection survives paging NO (clears —
      simplest correct).

### T5 — Web: alt consumption

- [x] Components mapping owner media arrays prefer `media.alt ?? <current
      synthesized alt>`: tour hero/gallery/cards, destination tiles, post
      cover/hero. Existing specs stay green (null alt = old output).

### T6 — Gate + adversarial review + merge

- [x] Kill orphan node → full affected gate green.
- [x] **Adversarial review** (GC semantics + migration + picker/duplicate
      edges + bulk-delete tx) — fix confirmed findings.
- [x] Report → user confirms → `prisma migrate deploy` live → commit →
      ff-merge → push → delete branch.
- [x] Docs sweep (rule 9): STATUS · roadmap · CLAUDE.md rows/test counts ·
      HANDOFF (D1 done → D2 next) · functions-admin.md (PATCH + bulk-delete
      rows) · data-model.md (alt column) · backend.md GC note if present.
