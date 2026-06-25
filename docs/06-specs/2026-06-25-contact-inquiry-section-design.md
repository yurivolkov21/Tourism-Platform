# Contact page — "Contact 01" inquiry section

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `fix/contact-inquiry-section`

The "Ways to reach us" three-card strip felt empty. Replace it (and the separate
form) with the Shadcn Space **"Contact 01 – Project Inquiry"** layout: contact
details on the left, a real enquiry form on the right.

## Changes
- **ContactInquiry** (new, `contact-inquiry.tsx`) — Contact 01 layout, brand-tokenized:
  left = "We can help" eyebrow + heading + contact details + a Separator + a
  "Built with" `TechMarquee`; right = a real enquiry form card (first/last name,
  email, an interest `Select`, message, a terms checkbox + honeypot). The form
  posts to `/enquiries` via `submitEnquiry` (`buildContactPayload`, TDD) with the
  shared `EnquiryStatus`/`EnquirySuccess` states — the first-class contact channel.
- Replaces both `ContactChannels` (deleted) and the page's `PlanTripForm` on the
  contact page (one strong section instead of weak cards + a separate form).
- **ContactInfo** reframed via i18n: "Where we’re based" + a single honest
  "Hà Nội, Vietnam" card (no fabricated street addresses / second office) + the
  Hà Nội map kept. Footer Information address de-faked to "Based in · Hà Nội,
  Vietnam".
- **TechMarquee** extracted from `BuiltWith` (shared) so the real tech-stack strip
  is reused on both About and Contact.

## Decisions (confirmed)
- Contact 01 replaces the channel cards + old form (consolidated). "Trusted by"
  fake logos → real "Built with" tech strip. Offices → single "Hà Nội" block.
- Phone/email shown as "Coming soon" placeholders until the team's real channels
  exist; the working form is the real channel. Interest `Select` (maps to the
  enquiry `interests`) instead of the sample's country picker.

## Verification
web jest 58 (+ buildContactPayload), lint/build/no-hex green; built against the
live API — inquiry section, form, real tech logos, reframed location all render;
fabricated addresses gone. Live `POST /enquiries` already verified (CORS + 201).

## Follow-ups
Real phone/email + WhatsApp when ready; footer office-hours/phones still
placeholder; `PlanTripForm` now unused (kept for reuse).
