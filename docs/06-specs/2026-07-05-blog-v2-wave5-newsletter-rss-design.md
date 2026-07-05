# Blog v2 Wave 5 — newsletter lead capture + RSS

- **Date:** 2026-07-05
- **Roadmap:** `docs/07-plans/2026-07-03-blog-v2-roadmap.md` (Wave 5 of 5 — final wave)
- **Scope:** BE small (`@tourism/api`) + web footer form + RSS (`apps/web`) + admin list
  (`apps/admin`). ONE user-gated migration, which also carries the deferred W3
  fast-follow (`MediaAsset` unique index → `registerAsset` upsert).
- **Locked decisions (roadmap 2026-07-03 + user 2026-07-05):** DB-backed lead capture, no
  external provider, no double-opt-in email; silent dedupe (no email-exists oracle);
  admin list + CSV export under Operations; RSS mirrors the sitemap fetch pattern; the
  `registerAsset` dup-race fix rides this wave's migration go/no-go.

## Verified facts

- **Enquiry module is the template** for an unauthenticated DB write (ADR-0008):
  `ThrottlerGuard` applied per-controller (NOT global), `@Throttle` 5/min/IP, `website`
  honeypot silently ack'd, ack DTO (`{ received: true }`-style — no data leak).
- `MediaAsset` has only `@@index([ownerType, ownerId, role])` — no unique on
  `(ownerType, ownerId, publicId)`; `registerAsset` (media.service.ts:187) is
  findFirst-then-create (benign dup race, ecc LOW).
- Web footer newsletter form is dead (`action="#"`, `site-footer.tsx:56`); web has **no
  toaster** — the enquiry CTA pattern is a client island + server action with inline
  `success | rateLimited | error` states. The newsletter form mirrors that (roadmap said
  "toast"; inline status is the repo's established pattern — deviation noted).
- `app/sitemap.ts` is the RSS fetch pattern: `revalidate = 300`, `fetchPostSlugs()`-style
  error-tolerant fetches, `absoluteUrl()` from `lib/site.ts`.
- Admin nav has an **Operations** group (`app-shell.tsx:48`, currently Enquiries +
  Outbox); list pages use `AdminTableShell` + `ServerTablePagination` + a
  `lib/<area>/data.ts` fetch via `getApiClient`.
- Web copy lives in `messages.footer` (newsletter keys already exist: heading, text,
  placeholder, CTA) — only new status strings are needed.

## Design

### BE (slice 1, branch `feat/blog-v2-newsletter-be`)

1. **Schema** (one migration, user go/no-go):

   ```prisma
   model Subscriber {
     id           String   @id @default(uuid()) @db.Uuid
     email        String   @unique @db.VarChar(200)
     source       String?  @db.VarChar(40)
     subscribedAt DateTime @default(now()) @map("subscribed_at")

     @@map("subscribers")
   }
   ```

   plus `MediaAsset` gains `@@unique([ownerType, ownerId, publicId])` (compound name
   `ownerType_ownerId_publicId`). **Pre-GO check:** run a duplicate-count SQL on live
   (`GROUP BY owner_type, owner_id, public_id HAVING COUNT(*) > 1`) — index creation
   fails on existing dupes (none expected; the endpoint is 2 days old).
2. **`registerAsset` → upsert** on the new compound unique (`update: {}` no-op) — the
   race disappears; behavior otherwise identical. Existing media.service specs are the
   regression net; adapt the two registerAsset cases to the upsert call shape.
3. **Newsletter module** (`modules/newsletter/`, mirrored on enquiry):
   - `SubscribeDto { email: IsEmail ≤200; source?: ≤40; website?: honeypot }` ·
     `SubscribeAckDto { received: true }`.
   - `POST /newsletter/subscribe` — `@Public`, controller-local `ThrottlerGuard`,
     `@Throttle` 5/min/IP, honeypot short-circuit, **silent dedupe** via
     `subscriber.upsert({ where: { email }, update: {}, create: … })` → always the same
     201 ack (no email-exists oracle). Email normalized `trim().toLowerCase()`.
   - `GET /admin/newsletter/subscribers` — admin-guarded (same guards as other admin
     controllers), `?page&pageSize&search` (email contains, insensitive), newest first →
     `{ data: SubscriberDto[], meta: PageMetaDto }` (existing envelope/pagination
     helpers). `SubscriberDto { id, email, source, subscribedAt }`.
4. Regen types (`/regen-types` flow) + consumer builds.

### Web (slice 2, branch `feat/blog-v2-newsletter-fe`)

5. **Footer form wired**: `components/marketing/newsletter-form.tsx` client island
   (drop-in for the dead `<form action="#">`, same classes/markup) + server action
   `lib/newsletter/actions.ts` → `POST /newsletter/subscribe` with `source: 'footer'`
   (native fetch to the public endpoint, mirroring the enquiry action; maps 429 →
   `rateLimited`). States: idle → pending (button disabled) → success (inline line
   replaces the form row) | rateLimited | error. Honeypot input included. New
   `messages.footer` keys: `newsletterSuccess`, `newsletterError`, `newsletterRateLimited`,
   `newsletterInvalid`.
6. **RSS** `app/blog/rss.xml/route.ts` (route handler, `revalidate = 300`): fetches
   `fetchPosts({ pageSize: 50 })` error-tolerant, emits RSS 2.0 — channel title/link/
   description from `messages.brand`/`messages.blog`, items = title · absolute link ·
   excerpt description · `pubDate` (RFC-822) · `guid`. Pure builder
   `lib/blog/rss.ts: buildRssXml(channel, items)` with XML-entity escaping (TDD).
   `Content-Type: application/rss+xml; charset=utf-8`. `<link rel="alternate">` added on
   the blog index layout metadata.

### Admin (slice 2)

7. **Subscribers page** `/subscribers` under Operations (icon `Mail`):
   `lib/subscribers/data.ts` (`listSubscribers` via `getApiClient`), server page with
   URL-driven `?page&pageSize&q`, `AdminTableShell` columns email · source ·
   subscribed date, `ServerTablePagination`.
8. **CSV export**: admin route handler `app/(admin)/subscribers/export/route.ts` —
   server-side session → pages through the list endpoint (pageSize 100 until `meta`
   exhausted), emits `text/csv` attachment (`subscribers-YYYY-MM-DD.csv`). Pure
   `lib/subscribers/csv.ts: toCsv(rows)` with quote-escaping (TDD). An "Export CSV"
   button links to the route.

## Out of scope

Double opt-in / confirmation emails · unsubscribe flow (export is for a future ESP
import; deletions via DB if ever needed) · external providers · admin delete UI ·
newsletter sending · web `/newsletter` landing page.

## Testing & process

- TDD: subscribe service (dedupe upsert call shape, honeypot handled in controller spec
  if the module has one — else service-level), admin list (pagination/search where-shape),
  registerAsset upsert adaptation, `buildRssXml` escaping, `toCsv` escaping, web action
  status mapping. Baselines: api **309** · admin **142** · web **175**.
- Slice 1 = BE: TDD → gate → **⛔ dupe-check + migration GO on live Supabase** →
  user review → rebase + `--ff-only` merge. Slice 2 = FE (web + admin): TDD on pure
  logic → gate → user review → merge. Gate:
  `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`.

## Planned files

| Slice | Action | File |
| --- | --- | --- |
| 1 | Modify | `apps/api/prisma/schema.prisma` (Subscriber + MediaAsset unique) + generated migration |
| 1 | Modify | `apps/api/src/modules/media/media.service.ts` (+spec) — upsert |
| 1 | Create | `apps/api/src/modules/newsletter/{newsletter.module,newsletter.controller,admin-newsletter.controller,newsletter.service}.ts` + `dto/` + specs |
| 1 | Modify | `apps/api/src/app.module.ts` (register module) |
| 1 | Modify | `libs/shared/core/src/lib/api/schema.ts` (regen) |
| 2 | Create | `apps/web/src/components/marketing/newsletter-form.tsx` · `apps/web/src/lib/newsletter/actions.ts` |
| 2 | Modify | `apps/web/src/components/layout/site-footer.tsx` (swap dead form) |
| 2 | Create | `apps/web/src/app/blog/rss.xml/route.ts` · `apps/web/src/lib/blog/rss.ts` + spec |
| 2 | Create | `apps/admin/src/app/(admin)/subscribers/page.tsx` · `export/route.ts` · `apps/admin/src/lib/subscribers/{data,csv}.ts` + csv spec · view component |
| 2 | Modify | `apps/admin/src/components/shell/app-shell.tsx` (nav) · `libs/shared/i18n/src/lib/messages.ts` (footer status keys) |

## Risks

- **Unique-index migration fails on live dupes** → pre-GO dupe-check SQL; if any, clean
  before deploy (expected: zero).
- **Email normalization**: uniqueness is on the normalized string; the DTO lowercases
  before upsert so `A@x.com` and `a@x.com` dedupe (documented in the service).
- **RSS validity**: entity escaping in the TDD'd builder; excerpts are plain text
  already (fallbackExcerpt strips markdown).
- **CSV injection**: `toCsv` quotes every field and doubles inner quotes; leading
  `=+-@` cells are prefixed with `'` (spreadsheet-formula guard).
- Deploy-lag: footer form 404s against an old API → generic error state (no crash).
