# API-W1 "Email revival" — design spec

**Date:** 2026-07-13 · **Scope:** `apps/api` + `docs/email-templates` ·
**Branch:** `feat/api-w1-email-revival`

## Context

The domain `nexora-travel.agency` went live on Resend 2026-07-13, unblocking
real delivery for the 4 wired EmailTypes. The remaining email debt is
code-side, and the visual design of every outbound email was approved by the
user the same day (preview artifact, **v2 "react.email Barebone" direction**,
label `v2-react-email-barebone`).

## Goals

1. **Activate the 2 silent cancellation emails** — `CANCELLATION_REQUESTED` /
   `CANCELLATION_DENIED` rows are enqueued today but fall into the dispatch
   `default` (warn + no-op) and get marked SENT without sending.
2. **Fix the refund email** — it prints `totalAmount` even for partial
   refunds. (Note: the refund CTEs gate on `status='PAID'`, so a booking can
   only ever be refunded once — the per-booking dedupe key is correct and
   does NOT need changing; only the rendered amount does.)
3. **Reply-to** — approved option 1: replies go to a support inbox via
   `RESEND_REPLY_TO_EMAIL`; today replies to `noreply@` bounce (no MX on the
   root domain).
4. **Newsletter welcome** — net-new EmailType + enqueue on first subscribe
   (today subscribing is completely silent).
5. **Re-skin all 10 emails** to the approved design: 7 Resend renderers in
   code + the 3 Supabase auth templates in `docs/email-templates/`.

## Non-goals

- No self-serve unsubscribe endpoint (newsletter footer says "reply to
  unsubscribe"; admin removes rows in `/subscribers`).
- No voucher/pre-departure email, no abandoned-checkout email (deliberate
  cuts, unchanged).
- No template engine (react-email/MJML/Handlebars) — the shell is a plain
  template-literal helper in `email.templates.ts` (existing idiom).
- Supabase custom SMTP + pasting the auth templates = dashboard steps, done
  with the user after merge.

## Design system (locked — port of react.email "Barebone", MIT)

Tokens (hex hardcoded by rule — emails can't read oklch tokens):

| Token   | Value                 | Use                                                         |
| ------- | --------------------- | ----------------------------------------------------------- |
| page bg | `#F3F4F6`             | email body background + inner content card                  |
| frame   | `#FFFFFF`             | outer 640px frame + data cards                              |
| fg      | `#14171E`             | headings, values                                            |
| fg-2    | `#43454B`             | body copy                                                   |
| fg-3    | `#7B7D81`             | notes, labels, footer                                       |
| stroke  | `#F0F0F0`             | hairlines between data rows                                 |
| brand   | `#2F6B4F`             | buttons, links, monogram (Nexora delta vs Barebone's black) |
| star    | `#B9832E`             | review stars only                                           |
| pill    | `#FDF3E0` / `#9A6B1F` | "Under review" status pill                                  |

Structure (all mocks in the artifact follow it):

- 640px white frame, radius 12 → header row (26px "N" monogram left,
  "Nexora" 13px `fg-3` right) → **gray content card** (`#F3F4F6`, radius 8,
  centered): 48px monogram OR hero image OR stars → h1 28px/600 → body 16px
  max-width 380–400px → optional **white data card** (label-left 13px `fg-3`
  / value-right 14px/500 `fg`, hairline rows; money values 16px/600 brand)
  → one brand button (radius 8, padding 16/28) → 13px `fg-3` note → footer
  on white (tagline · contact · reason-for-email line; Unsubscribe line on
  newsletter ONLY).
- Font: Inter webfont (3 static weights 400/500/600 from fonts.gstatic, the
  exact react.email `theme-fonts` approach) + Arial fallback; clients that
  strip webfonts get Arial and the layout must not depend on Inter metrics.
- Every send keeps a **plain-text part** with the same information
  (deliverability; existing behavior).
- **All interpolated user content is HTML-escaped** (names, messages,
  decision notes, tour titles).

## The 7 Resend renderers

| #   | Renderer                            | Vars added/changed                                  | Notes                                                                                                                                                                                                |
| --- | ----------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `renderBookingConfirmation`         | `+ tourImageUrl?`, `+ tourImageAlt?`, `+ manageUrl` | Hero image when the tour has one (hydrated); data card: code · tour · departure → return · travellers · total paid; CTA "View my booking" → `{FRONTEND_URL}/account/bookings`; voucher + reply note. |
| 2   | `renderBookingRefunded`             | `+ refundedAmount`, `+ isPartial`                   | Data card: Refund issued (brand, `refundedAmount`) · Of total paid (partial only) · Returns to; 5–10 business days; partial adds "booking stays active".                                             |
| 3   | `renderReviewApproved`              | `+ tourUrl`                                         | Gold stars ★ row; CTA "See your review" → `{FRONTEND_URL}/tours/{slug}`.                                                                                                                             |
| 4   | `renderEnquiryReceived`             | `+ browseUrl`                                       | White quote card labeled "YOUR MESSAGE"; "browse our tours" link → `/tours`; reply note.                                                                                                             |
| 5   | `renderCancellationRequested` (NEW) | code, tourTitle, contactName                        | Data card: Status pill "Under review" · "If approved → a refund email follows"; 48h copy; seats-unchanged note.                                                                                      |
| 6   | `renderCancellationDenied` (NEW)    | code, contactName, decisionNote?, manageUrl         | White quote card "REASON" (fallback copy when the admin left no note); booking-stays-active body; CTA "View my booking".                                                                             |
| 7   | `renderNewsletterWelcome` (NEW)     | `+ journalUrl`                                      | Perks data card (journeys first / field notes / seasonal tips); CTA "Read the Journal" → `/blog`; footer carries the unsubscribe line.                                                               |

Subjects: `Booking confirmed — {code} · {tour}` · `Refund on its way —
{code}` · `Your review is live — {tour}` · `We received your enquiry[ —
{tour}]` · `We're reviewing your cancellation request — {code}` · `About
your cancellation request — {code}` · `Welcome to the Nexora Journal`.

## Plumbing changes

1. **Schema/migration**: `EmailType` + `NEWSLETTER_WELCOME` (ALTER TYPE ADD
   VALUE migration; `migrate deploy` against prod happens at merge time like
   previous schema waves).
2. **`newsletter.service.subscribe`**: short `$transaction` — existing upsert
   - `outbox.createMany({ skipDuplicates })` with
     `dedupeKey: newsletter-welcome:{email}`, payload `{ email }`. The dedupe
     key makes repeat subscribes silent at the outbox layer, so the
     no-email-exists-oracle property of the endpoint is preserved.
     **Decision (review 2026-07-13):** the dedupe row outlives an admin
     removal → one lifetime welcome per address (a removed-then-resubscribed
     address is not re-welcomed). Accepted on purpose — never spammy.
3. **`outbox.service` dispatch** — 3 new cases (existing warn+consume pattern
   for missing entities):
   - `CANCELLATION_REQUESTED` `{bookingId}` → booking (code, contactName,
     contactEmail, tour title) → renderer 5.
   - `CANCELLATION_DENIED` `{requestId}` → cancellationRequest
     (decisionNote + booking code/contactName/contactEmail) → renderer 6.
   - `NEWSLETTER_WELCOME` `{email}` → renderer 7 (no hydrate needed beyond
     the payload; a vanished subscriber row is NOT checked — the welcome is
     harmless and the payload is self-sufficient).
     Booking-confirmation hydrate additionally selects tour `slug` + hero
     media (`mediaAsset` ownerType TOUR · role `hero` · lowest `sortOrder`) →
     `buildCloudinaryUrl(cloudName, asset)` for the hero URL, `alt` fallback
     to the tour title. Refund hydrate additionally selects `refundedAmount` +
     `status` (isPartial = `PARTIALLY_REFUNDED`; null refundedAmount falls
     back to totalAmount).
4. **`email.service`**: pass `replyTo` (when configured) on every send; three
   new send methods; `FRONTEND_URL` (existing `app` config) injected for CTA
   URLs — URL building happens in the outbox hydrators, renderers stay pure.
5. **Config**: `RESEND_REPLY_TO_EMAIL` optional (Joi: email format inside
   either `addr@x` or `Name <addr@x>`, empty allowed → feature off);
   `RESEND_FROM_EMAIL` gains the same format validation (today any string
   boots). `emailConfig` exposes `replyTo`. `.env.example` + env runbook
   updated.
6. **`docs/email-templates/`**: the 3 Supabase auth files rewritten to the
   v2 design (subjects unchanged, `{{ .ConfirmationURL }}` kept); README
   design-notes section updated (new tokens, Inter note).

## Testing (TDD on every renderer/дispatch change)

- Renderer specs: subject lines · escaping (script tag in enquiry message /
  decision note / names) · partial vs full refund wording · hero `<img>`
  present only when URL given · unsubscribe line only in newsletter · text
  part carries code/amounts.
- Dispatch specs: 3 new routes · hydrate-miss consumes row (no throw) ·
  refund vars (partial + full + legacy null refundedAmount).
- Newsletter spec: enqueue with dedupe key + skipDuplicates inside the tx.
- Email service spec: replyTo passed when configured, absent otherwise.
- env.validation spec: replyTo optional/format, bad RESEND_FROM_EMAIL
  rejected (update the existing happy-path fixture if needed).

Existing `outbox.service.spec.ts` tests asserting the old `default` behavior
for cancellation types will be updated to the new cases.

## Risks

- ALTER TYPE ADD VALUE can't run inside a transaction on some Postgres
  setups — Prisma handles this migration shape; verify `migrate deploy`
  output on prod at merge time.
- Webmail clients that strip webfonts → Arial fallback (accepted, same as
  react.email's own templates).
- Larger HTML bodies (~10–14 KB) — well under Gmail's 102 KB clip limit.
