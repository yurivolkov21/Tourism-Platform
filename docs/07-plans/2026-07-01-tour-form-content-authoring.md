# Tour form content authoring + rich itinerary — implementation plan

- **Date:** 2026-07-01
- **Spec:** [2026-07-01-tour-form-content-authoring-design](../06-specs/2026-07-01-tour-form-content-authoring-design.md)
- **Rule:** one slice = one branch → `/gate` → review → **user reviews on deploy** → merge → delete branch

## Sequencing

Web must render markdown before admins author it, so: admin quick-wins (independent) → web rich render →
admin markdown authoring + API length bump. Plain text renders fine throughout, so there's no hard
break — but this order avoids ever showing raw `**` markers.

## Slice 1 — Admin quick-wins (non-markdown)

**Branch:** `feat/admin-tour-form-quickwins`

- `tour-form.tsx`: slug auto (`slugify(title)` until `slugEdited`, mirroring `destination-form.tsx`).
- Meeting point: add `FieldDescription` with the "Venue name, street address, city" convention +
  example.
- Content: `ChipInput` → `Textarea` (one-per-line) for Highlights / Included / Excluded + "One item per
  line" hint. Update `lib/tours/actions.ts` to parse these from the textarea value (split `\n`, trim,
  drop empties) instead of `formData.getAll`. Remove `chip-input.tsx` if now unused (grep first).
- FAQ / Policy: enrich placeholders + `FieldDescription`s (explain Kind = grouping, not shown verbatim).
- Tests: `tours/schema.spec.ts` — Content arrays still validate; add a parse test if the split lives in
  a pure helper.
- **Gate** `@tourism/admin` + `ecc:code-reviewer` (form + action-parse change).

## Slice 2 — Web rich content (itinerary markdown + highlights)

**Branch:** `feat/web-tour-itinerary-markdown`

- Add deps `react-markdown` + `remark-gfm` to `apps/web`.
- `components/tours/tour-itinerary.tsx`: render the day `body` with `<ReactMarkdown remarkPlugins={[remarkGfm]}>`
  - a `components` map (Tailwind classes on headings/strong/em/lists/p/a) inside the Stepper panel;
  drop the `parseItinerary` milestone list. Keep the day-nav + Back/Next.
- Remove `lib/itinerary.ts` + `lib/itinerary.spec.ts` once unused.
- Highlights: map `dto.highlights` in `lib/api/tour-detail.ts` into `TourDetailVM` (add the field), and
  render a **Highlights** section on the detail page (near `TourOverview`; hidden when empty).
- **Gate** `@tourism/web` + `ecc:code-reviewer` (new dep + render change; verify no raw-HTML/XSS path).

## Slice 3 — Admin markdown authoring + API length bump

**Branch:** `feat/tour-itinerary-markdown-authoring`

- API: `TourItineraryDayInput.description` `@MaxLength(2000)` → `8000` (Render redeploy; no regen).
- Admin `tourSchema`: itinerary description `max(2000)` → `max(8000)`; update its spec.
- `tour-form.tsx`: enlarge the itinerary Description `Textarea` (more rows) + a markdown **cheatsheet**
  `FieldDescription` (bold / list / line breaks) + a markdown example placeholder. Optionally the same
  larger textarea treatment for policy body (still plain text).
- **Gate** `@tourism/api` + `@tourism/admin`. Small; self-certify or a quick review.

## Definition of done (per slice)

- `pnpm nx run-many -t lint typecheck test build -p <project>` green.
- Slices 1–2: `ecc:code-reviewer` clean of CRITICAL/HIGH.
- User confirms on deploy: slug auto-fills; meeting-point hint present; content one-per-line; itinerary
  renders rich markdown in the Stepper; highlights show on the tour detail; form stays single-column.
- Branch merged `--ff-only` to `main`, branch deleted; memory + this plan updated.

## Progress

- [x] Slice 1 — Admin quick-wins (merged `687301a`)
- [x] Slice 2 — Web itinerary markdown + highlights wiring (merged `174b15d`)
- [x] Slice 3 — Admin markdown authoring + API itinerary length bump (merged `24979ef`)

**DONE 2026-07-01.** Slug auto-fills from title; meeting-point format hint; Content lists →
one-per-line textareas; policy/faq hints. Web renders itinerary days as Markdown (react-markdown +
remark-gfm, scoped styles, no raw-HTML) inside the day Stepper; Highlights now wired into the VM +
shown on the tour detail. Itinerary day cap raised 2000→8000 on the API DTO + admin schema; admin
authors Markdown in a monospace textarea with a cheatsheet. Slices 1–2 reviewed (ecc, 0 CRITICAL/HIGH;
one LOW list-marker fix folded into Slice 2). `react-markdown` infra is reusable for the deferred blog
reader (Post.content is markdown).

## Out of scope (deferred)

- Two-column form, markdown for FAQ/policy, WYSIWYG/live-preview, blog reader.
