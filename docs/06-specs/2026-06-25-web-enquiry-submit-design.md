# Web enquiry submission — design

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `feat/web-enquiry-submit`

## Context

The public web was 100% read-only — the two lead-capture forms (`PlanTripForm`
on `/contact`, and `EnquiryCta` on home/about/destinations/faq/tour-detail) were
UI-only and submitted nothing. This wires them to `POST /api/v1/enquiries`
(`CreateEnquiryDto`), the first write path on the customer web.

## Decisions

- **Client-side submit** (not a Server Action): the API throttles `/enquiries`
  per-IP (5/min). A browser submit gives each visitor their own budget; a Server
  Action would funnel every lead through one Vercel IP and trip the limit. CORS
  on the API already allows the web origin (verified via preflight).
- **Message is required (≥10 chars)** by the DTO. `EnquiryCta` has no message
  field, so it composes one from its free-text destination; `PlanTripForm` folds
  its form-only **duration** chip (the Enquiry model has no duration field) into
  the message. Both fall back to a generic line when the visitor gave nothing.
- **Honeypot** (`website`) added to both forms — hidden from users; the API
  silently drops non-empty submissions (201, no hint to bots).

## Shape

- `lib/enquiry-form.ts` (pure, TDD'd) — `composePlanTripMessage`,
  `composeEnquiryMessage`, `parseGroupSize`, `buildPlanTripPayload`,
  `buildEnquiryCtaPayload`, `isValidEnquiry`. Map raw fields → `EnquiryPayload`
  (drop empty optionals, coerce groupSize to a 1–100 int, budget→budgetTier).
- `lib/api/enquiry.ts` — `submitEnquiry(payload)`; never throws, returns
  `{ ok } | { ok: false, rateLimited }` (429 → tailored message).
- `components/marketing/enquiry-status.tsx` — shared `EnquirySuccess` panel +
  inline `EnquiryStatus` error (invalid / generic / rate-limited).
- `PlanTripForm` / `EnquiryCta` become client components with an idle →
  submitting → success/error state machine; success replaces the form; the
  submit button disables while sending. Copy lives in `@tourism/i18n`
  (`enquiryForm` states).

## Tests / verification

- `lib/enquiry-form.spec.ts` (web jest) — message composition, payload mapping,
  groupSize coercion, validation.
- Live API: CORS preflight allows the web origin; `POST /enquiries` returns
  `201 { data: { received: true } }` for the composed payload.

## Out of scope

Booking flow + web auth (next big feature). Admin enquiry inbox UI (endpoints
exist; no admin screen yet — the test lead can be cleaned there later).
