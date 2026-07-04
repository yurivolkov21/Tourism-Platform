# Admin Users module + hardening (completeness wave) — design

- **Date:** 2026-07-03
- **Scope:** the final admin wave before declaring `@tourism/admin` done — Slice 1: net-new
  **Users management** (`/admin/users` BE + `/users` FE, incl. DB-role-driven admin grant);
  Slice 2: **hardening** (Outbox email-queue visibility + retry · dashboard DataTable de-fake ·
  two Wave-4 LOW fixes · NavUser stub cleanup). Follows the enrichment roadmap
  (all 7 waves ✅ 2026-07-02); after this wave the next phase is P6 web blog reader.
- **Status:** approved direction, spec for execution
- **Trigger:** user request ("admin chưa có chỗ quản lí người dùng — còn thiếu gì nữa không?")
  - a 2-agent BE/FE completeness audit (2026-07-03).

## Key facts (verified by audit)

- **`User` + `Outbox` are the only Prisma models with ZERO admin surface** (24 controllers
  swept). `User` (schema.prisma:130-153): `id, supabaseId, email (citext unique), fullName,
  phone, locale, role CUSTOMER|ADMIN, createdAt/updatedAt` + relations bookings/reviews/
  wishlist/posts + `@@index([role])` (already anticipates role filtering).
- **Admin grant today is env-only:** `AuthService.syncAdmin` (auth.service.ts:43-55) 403s
  unless the Supabase email is in the `ADMIN_EMAILS` env allowlist — promote/demote requires an
  env edit + Render redeploy. The DB `role` column follows the env at sync; `RolesGuard`
  authorizes per-request from the mirrored user row.
- **Reusable templates:** `BookingsService.findAllForAdmin/findByCodeForAdmin` (admin
  list/detail shape) · `UsersService.deleteMe` (users.service.ts:42-75 — 409
  `ACCOUNT_HAS_BOOKINGS` guard, `user.delete` cascade, best-effort Supabase Admin REST
  `DELETE /auth/v1/admin/users/:supabaseId`) · `MediaService.attachToOwner` (USER avatar) ·
  Wave 6's `/bookings?userId=` deep-link (detail → user's bookings is free) · the TanStack
  list foundation (Users = 10th table) · the Garbage-tab pattern (Outbox twin).
- **Outbox** (schema.prisma:553-566): `status PENDING|SENT|FAILED, attempts, lastError` —
  consumed only by the `drainOutbox` pg-boss cron; no controller in the jobs module. An admin
  cannot see failed booking-confirmation emails without a raw DB query.
- **Dashboard DataTable ships dashboard-01 demo affordances that DO NOTHING** (data-table.tsx):
  drag-reorder not persisted · inline-editable Tour/Amount cells that silently lose edits on
  refresh (the worst offender — reads as a real editing feature) · row checkboxes with no bulk
  action · a read-only Drawer duplicating the richer `/bookings/[code]` page.
- **Wave-4 LOW leftovers:** `TopToursCard` hardcodes `'USD'` (top-tours-card.tsx:88) ·
  its tablist has no keyboard nav / `aria-controls` (top-tours-card.tsx:56-78).
- **NavUser stubs:** Account + Notifications are `disabled` menu items ("Not wired yet",
  nav-user.tsx:69-77).

## Decisions (user-confirmed)

1. **Wave scope = Users module + hardening** (one wave, two slices; PaymentEvent global viewer
   excluded — Wave 6's per-booking trail covers the need).
2. **Users scope = FULL:** list + detail + role management + delete. Role management is
   DB-driven: `syncAdmin` changes to accept env-email **OR** DB `role=ADMIN` (env becomes the
   bootstrap); guards below.
3. Controller-decided by convention: list = TanStack table (10th on the shared foundation);
   detail = a PAGE (actions + aggregates), not a drawer.

## Slice 1 — Users module

### BE — new `AdminUsersModule` (`@Roles(UserRole.ADMIN)` class-level)

- **`GET /admin/users`** — paginated (default 20, max 100), newest first; `search` (trimmed,
  MaxLength 160, case-insensitive contains on fullName/email — email is citext) AND-composes
  with `role?` filter. Rows: `AdminUserListItemDto { id, email, fullName, phone, role,
  createdAt, bookingsCount }` (`_count.bookings`, the Wave-5 toursCount pattern).
- **`GET /admin/users/:id`** — `AdminUserDetailDto`: the list fields + `locale`, `updatedAt`,
  `avatarUrl` (via `attachToOwner(USER)`, the `PostAuthorDto.avatarUrl` pattern) + counts
  `{ bookings, reviews, wishlist }` via `Promise.all` + **`isEnvAdmin: boolean`** (email ∈
  `ADMIN_EMAILS` — the FE explains why demote is blocked) + **`isSelf: boolean`** (target id ==
  caller id — the FE disables self-directed actions).
- **`PATCH /admin/users/:id/role`** — body `{ role: UserRole }`. Guards (each a distinct 409
  code + message): **self-change blocked** (`ROLE_SELF_CHANGE`) · **demoting an env-admin
  blocked** (`ROLE_ENV_ADMIN` — env is bootstrap, only an env edit can demote them) ·
  **demoting the last ADMIN blocked** (`ROLE_LAST_ADMIN`, count check). Promote CUSTOMER→ADMIN
  has no extra guard. Returns the updated detail-lite row.
- **`DELETE /admin/users/:id`** — generalizes `deleteMe`: 409 `ACCOUNT_HAS_BOOKINGS` when the
  user has ANY booking (policy unchanged — no force-delete) · **self-delete blocked**
  (`USER_SELF_DELETE`; use the account's own flow) · **deleting an ADMIN blocked**
  (`USER_IS_ADMIN` — demote first; keeps destructive paths single-purpose) · **posts-author
  guard** 409 `USER_HAS_POSTS` via a `post.count` pre-check (VERIFIED: `Post.author` is
  `onDelete: Restrict`, schema.prisma:533 — the DB would reject anyway; the guard makes it a
  friendly 409). Deletes the local row (cascades reviews/wishlist) + best-effort Supabase
  Admin REST delete + avatar media cleanup via `deleteForOwner` (garbage-queued like every
  owner delete).
- **Auth change (`AuthService.syncAdmin`):** accept when email ∈ `ADMIN_EMAILS` **OR** the
  mirrored user row has `role=ADMIN`. Order: resolve/sync the user row first (existing upsert
  logic), then authorize. Env emails keep being force-synced to `role=ADMIN` (bootstrap
  invariant). TDD heavily — this is the console's front door: env-admin passes · DB-admin
  (not in env) passes · plain customer 403s · a demoted DB-admin 403s on next sync.
- Tests (TDD): list mapping/filters/search · detail counts + isEnvAdmin/isSelf · every role
  guard · every delete guard incl. has-bookings and posts-author path · syncAdmin matrix.
  Regen types. Baselines: api 266.

### FE — `/users` (sidebar: Operations group, Users item)

- **List:** 10th table on the shared TanStack foundation, **server-driven like Bookings**
  (users grow unbounded): URL params `?role=&q=&page=&pageSize=` → API; tabs All/Admins/
  Customers map to the `role` filter · search box submits `?q=` · Columns menu ·
  `ServerTablePagination`. Columns: Name (→ detail) · Email · Role badge · Bookings · Joined.
- **Detail `/users/[id]`:** header (avatar + name/email + Role badge + env-admin chip when
  `isEnvAdmin`) · facts card (phone/locale/joined/updated) · 3 stat rows with links (Bookings →
  `/bookings?userId=…` · Reviews → `/reviews` · Wishlist count plain) · **Danger zone card**:
  Change-role control (Select + confirm AlertDialog; disabled with explanatory tooltip/copy when
  `isSelf` or `isEnvAdmin`) + Delete user (destructive AlertDialog naming the consequences;
  disabled when `isSelf` or role=ADMIN; friendly 409 messages via `FRIENDLY_BY_CODE`).
- **NavUser cleanup:** remove the Notifications stub; **Account → `/users/me`** (VERIFIED:
  the shell only holds the session email, not the local user id — so add a tiny
  `GET /admin/users/me` (detail of the caller via `@CurrentUser`, declared BEFORE `:id`) and a
  static FE route `apps/admin/src/app/(admin)/users/me/page.tsx` reusing the same detail
  component — Next.js prefers static segments over `[id]`, no collision).
- Server actions via `apiWrite`/typed DELETE; toasts; TDD pure helpers (role guards display
  logic if any lands in lib).

## Slice 2 — Hardening

- **Outbox visibility (BE S–M):** `GET /admin/outbox` — paginated, `status?` filter, newest
  first: `{ id, type, status, attempts, lastError, createdAt, sentAt }` (payload NOT exposed —
  same PII stance as payment events). `POST /admin/outbox/:id/retry` — FAILED rows only
  (409 otherwise): reset to PENDING + attempts preserved, letting the next `drainOutbox` tick
  (1m cron) pick it up — NO direct send from the request path (keeps email sending in one
  place). Tests TDD; regen.
- **Outbox FE:** `/outbox` page or a tab — follow the Garbage-tab twin: count line + compact
  table (type · status badge · attempts · lastError truncate · queued/sent) + per-FAILED-row
  Retry button (toast). Sidebar: under Operations ("Email queue").
- **Dashboard DataTable de-fake (FE S–M):** remove drag-reorder (DndContext/DragHandle),
  inline-edit cells (render plain text), row checkboxes + "N selected" footer, and the
  row Drawer; row click / code cell → `/bookings/[code]`. Keep status tabs + Columns +
  pagination. Delete now-unused dnd-kit imports from the file (the dep stays — media form uses
  it).
- **Wave-4 LOW fixes (S):** `TopToursCard` — thread the stats currency (use
  `overview.currency` like SectionCards; if `topToursByRevenue` rows lack currency, reuse the
  overview's) · tablist keyboard nav: arrow-key roving focus + `aria-controls`/panel `id`
  per the ARIA tabs pattern.
- Order within the slice: Outbox BE → regen → Outbox FE → DataTable → LOW fixes (independent
  tail tasks).

## Out of scope

Partial refunds (L — new status + gateway plumbing) · real Notifications (no data source) ·
PaymentEvent global viewer · bulk actions · media reuse/picker · admin self-service profile
editing (Account links to the read-only own detail; editing stays in the web account flow).

## Testing & process

- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`; per-commit
  typecheck-green (SDD lesson from Wave 7: no imports/types parked for a later task).
- SDD: haiku transcription / sonnet reasoning + all task reviewers; **`ecc:code-reviewer` on
  BOTH slices** (both touch BE); slice 1 review must include the auth angle (syncAdmin change =
  console front door; role guards; Supabase Admin REST deletion).
- Baselines: api 266, admin 131. Merge-to-main per green slice pre-authorized; stop on
  CRITICAL/HIGH. Straight quotes; never stage unrelated dirty files.

## Risks

- **`syncAdmin` change is security-sensitive:** a bug could lock every admin out (env fallback
  mitigates — env-admins always pass) or let a customer in (the OR must check the MIRRORED
  row's role, never client input; TDD matrix + reviewer focus).
- **Role/delete guards race:** last-admin check is read-then-write; acceptable at this scale
  (single-admin reality), note in code.
- **Post authors:** `Post.author` is `onDelete: Restrict` (verified) — without the
  `USER_HAS_POSTS` pre-check the delete dies as a raw Prisma FK error; the guard is
  load-bearing, not cosmetic.
- **Outbox retry:** reset-to-PENDING only (no inline send) keeps idempotency with the cron;
  a double-retry before the tick is a no-op (already PENDING → 409 or harmless).
- **Deploy-lag:** new pages error until Render ships — same-wave BE+FE, standard ErrorAlert.

## Success criteria

- Admin can find any user, see their footprint, promote/demote (with the env-bootstrap rule
  visible), and delete a bookings-free customer — no env edits or DB queries. Failed
  booking-confirmation emails are visible and retryable. The dashboard no longer pretends to
  edit bookings. NavUser has no dead items. Gate green per slice; both slices agent-reviewed.
  After merge: admin declared DONE; next phase = P6 web blog reader.
