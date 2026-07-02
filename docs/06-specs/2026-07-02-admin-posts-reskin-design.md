# Admin Posts reskin + detail — design

- **Date:** 2026-07-02
- **Scope:** `@tourism/admin` Posts surfaces (list · new detail page · form) + one small additive
  `@tourism/api` change (admin detail DTO gains the author)
- **Status:** approved direction, spec for execution
- **Trigger:** Posts is the last admin CRUD still on the pre-template look — old narrow container,
  GET-form filter with a native `<select>`, server-side pagination, bespoke `DeletePost`, title not
  clickable, **no detail page**, flat un-sectioned form with another native `<select>`. Bring it in
  line with the established admin template (memory `admin-ui-design-consistency`): **same components,
  same layout, no bespoke one-offs.**

## Reference template (already shipped on Destinations / Categories / Tours / Departures)

- **List page:** `flex flex-col gap-6 px-4 py-6 lg:px-6` + `AdminListHeader` (title/description +
  primary "New …" action) → a **client table component** doing: status **tabs with counts**, instant
  search, `ColumnsMenu`, `AdminTableShell` (TanStack), `ClientTablePagination`, `RowActions` (⋮ Edit ·
  Delete). Load-all client-side (small catalog), instant filter.
- **Detail page:** `mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6` · back link · header (h1 + status
  dot Badge + Edit button + `RowActions` with `redirectTo`) · 2-col Card grid (main col-span-2 + rail)
  · `Row` label/value helper · dates as `formatDate` + `formatRelativeTime` (`lib/relative-time.ts`).
- **Form:** shadcn **Form Layout 2** — sectioned `FieldSet` + `Separator`, `@tourism/ui` `Select`
  (never native `<select>`; `align="start" alignItemWithTrigger={false}` + hidden input), auto-slug
  from the name/title field, `flex justify-end` Cancel(outline) + Submit.

## Decisions (user-approved)

- **Scope:** reskin (list + form) + new detail page + **author enrichment on the admin detail DTO**.
  Cover-image/media upload for posts is **deferred** (DB `MediaOwnerType.POST` exists, but the API has
  no `POST_COVER` purpose / media endpoint — that is a later, bigger slice).
- **Detail renders the Markdown content** — add `react-markdown` + `remark-gfm` to `apps/admin`
  (same versions `apps/web` already uses for the tour itinerary; scoped `components` map, **no
  rehype-raw → no XSS**).
- **Author only on the detail** (not a list column) — YAGNI for a one-admin blog.
- **3 slices, detail-first** (the Tours rhythm): 1) BE author + detail page → 2) list reskin →
  3) form reskin. One branch per slice; user reviews before each merge.

## Slice 1 — BE author enrichment + detail page

### BE (`apps/api`, additive, admin route only)

- New `AdminPostDetailDto extends PostDto` with `author: PostAuthorDto { fullName: string | null;
  email: string }` — same admin-detail-only pattern as `AdminBookingDetailDto.refundedBy` /
  `AdminDestinationDetailDto` (no change to the public `GET /posts/:slug` or the shared `PostDto`).
- `PostsService.findDetailForAdmin(slug)`: `findUnique({ where: { slug }, include: { author:
  { select: { fullName: true, email: true } } } })`, 404 via the existing `notFound`, return the post
  with the flat `author` object. `findBySlug` stays as-is (still used by `update`/`remove` and the
  public path is untouched).
- `AdminPostsController.detail()` → `findDetailForAdmin` + `@ApiOkResponse({ type:
  AdminPostDetailDto })`.
- Regen `@tourism/core` types (boot the API locally, `nx run @tourism/core:api-types`).
- Service spec: +2 tests (detail returns the author; unknown slug → 404 `POST_NOT_FOUND`).

### FE (`apps/admin`)

- **New `/posts/[slug]` page** mirroring the Categories detail:
  - Back link "Back to posts" · header: h1 title + dot Badge (Published/Draft) + Edit button +
    `RowActions` (`deleteAction={deletePost}`, `redirectTo="/posts"`).
  - Sub-line under the h1: the excerpt (when present).
  - **Main (col-span-2):** Card "Content" rendering `content` via `react-markdown` + `remark-gfm`
    with a scoped `components` map (headings/lists/links/blockquote/code styled to the admin theme).
  - **Rail:** Card "Details" — `Row`s for Status · Slug (`<code>`) · Author (fullName, email as the
    muted second line) · Published (date + relative) · Created · Updated.
- `lib/posts/data.ts`: `getPost` return type switches to the regenerated `AdminPostDetailDto` shape
  (envelope-unwrap stays).
- **List title cell → links to `/posts/[slug]`** (done in this slice, like Tours slice 1).
- New deps in `apps/admin`: `react-markdown`, `remark-gfm` (same versions as `apps/web`).

## Slice 2 — list reskin (`app/(admin)/posts/page.tsx` + `components/posts/posts-table.tsx`)

- Page (server): container → `flex flex-col gap-6 px-4 py-6 lg:px-6` + `AdminListHeader` (title
  "Posts", keep the current description, action "New post"); fetch **all** rows via
  `listPosts({ pageSize: 100 })` (API cap 100 — fine for the blog catalog) and hand them to the
  client table. Drop the GET filter form, the native status `<select>`, `ServerTablePagination`, and
  the `?search=&status=&page=` URL params (client state now, same as Tours).
- **`PostsTable` rebuilt on the shared foundation** (8th table): status tabs **All / Published /
  Draft with counts** (client `useMemo`) · instant title search (lowercase normalize, like Tours) ·
  `ColumnsMenu` · `AdminTableShell` · `ClientTablePagination`.
- Columns: Title (link → detail, truncate, `font-medium`, `enableHiding:false`) · Status (dot Badge)
  · Published (date, tabular-nums) · Updated (relative, hideable) · Actions = **`RowActions`** ⋮
  (Edit · Delete via `deletePost`; `enableHiding:false`).
- **Delete `components/posts/delete-post.tsx`** (bespoke) — `RowActions` covers it (toast included).
  Verify no other importer first.
- Empty state: keep the current `Empty` block, copy adjusted to the active tab/search.

## Slice 3 — form reskin (`components/posts/post-form.tsx`)

- Rebuild to **Form Layout 2**, three sections with `Separator`s:
  1. **Basics** — Title · Slug (**auto-slug from Title** until manually edited — `lib/slugify.ts` +
     `slugEdited` state, mirroring tour-form; on edit an existing slug means `slugEdited` starts
     true) · Excerpt.
  2. **Content** — the Markdown `Textarea` (monospace, `rows=16`) + the existing hint.
  3. **Publishing** — Status → `@tourism/ui` `Select` (controlled + hidden `name="status"` input,
     `align="start" alignItemWithTrigger={false}`) + the "publishing stamps the publish date" hint.
- Button row → `flex justify-end gap-3` Cancel(outline) + Submit.
- **No change to field `name`s** (`title/slug/excerpt/content/status`) → `schema.ts` / `actions.ts` /
  `schema.spec.ts` untouched.

## Out of scope

- Post cover image / media upload (BE `UploadPurpose.POST_COVER` + `PUT /admin/posts/:slug/media` +
  DTO media — its own later spec).
- The public web blog reader (`/blog`, `/blog/[slug]`) — still the deferred P6 item.
- Author on the list DTO / list column. Any change to public posts endpoints.

## Testing

- BE: 2 new service spec tests; existing posts service/controller specs stay green.
- FE: `schema.spec.ts` unchanged-green; auto-slug reuses the already-tested `lib/slugify.ts`;
  table/detail are typecheck- + build-guarded (mirrors the reviewed Tours pattern), visual check on
  the Vercel deploy per the usual rhythm.
- `/gate` per slice. Slice 1 (BE surface) → `ecc:code-reviewer`; slices 2–3 are reskins of reviewed
  patterns → self-certified.

## Risks

- **Envelope unwrap:** single-resource admin fetches must unwrap `.data` (memory
  `admin-api-envelope-unwrap`) — `getPost` already does; keep it through the type change.
- **Markdown safety:** no `rehype-raw`, scoped components only — same stance as the web itinerary
  renderer.
- **Base UI footguns** (known): `Select` hidden-input pattern; `RowActions`/`ColumnsMenu` already
  safe.
- **Removing `delete-post.tsx`:** confirm no other importer before deleting.
- **Regen types ripple:** regenerating `@tourism/core` picks up any other drifted DTOs — review the
  diff; unrelated churn is fine if typecheck stays green across web/admin.

## Success criteria

- Posts list/detail/form are indistinguishable in structure from Destinations/Categories/Tours:
  template container + header, tabs with counts, instant search, Columns button, client pagination,
  ⋮ row actions, linked title, card detail with rail facts, Form Layout 2 with a real `Select`.
- Detail shows the author's name (not a UUID) and renders the Markdown body.
- No native `<select>` remains anywhere in the admin app.
- `/gate` green per slice; slice 1 agent-reviewed before merge.
