# Contact Launcher — design spec

**Date:** 2026-07-14 · **Scope:** `@tourism/web` only · **Status:** DRAFT (awaiting user review)

## Goal & Scope

Give visitors a direct, low-friction way to talk to us. Upgrade the existing
`FloatingContact` bubble on the web app into a **Contact Launcher**: a floating
button that opens a popover listing contact channels — **WhatsApp** (click-to-chat
deep link with tour-aware prefill) and **Send an enquiry** (existing `/contact`
CRM form). The channel list is config-driven so future channels (Messenger,
Telegram, LINE, Kakao) are a config entry, not a code change.

No API, schema, or admin changes. This is phase 1 of the chat direction; the
in-web Supabase Realtime chat and Business-API integrations are documented as
future phases in the Appendix.

### Locked decisions (from brainstorming, 2026-07-14)

1. Channels at launch: **WhatsApp + Send an enquiry**. Zalo rejected (audience
   is international, EN-only site), Telegram deferred (owner account banned),
   Messenger deferred (no Facebook Page yet).
2. WhatsApp via **personal-number deep link** (`wa.me`) — no Business API, no
   Meta verification, zero cost.
3. Channel list **config-driven via env**; a channel with no env value is
   hidden. Site never shows a dead button.
4. Launcher hidden on the **booking money-path** (checkout distraction rule).
5. EN-only copy per ADR-0005, centralized in `@tourism/i18n`.
6. In-web Supabase chat is **deferred, not rejected** — research preserved in
   the Appendix so phase 2 does not start from zero.

### Out of scope

- Any messaging **Business/Platform API** (webhooks, admin inbox) — needs a
  registered business (Zalo OA requires GPKD; WhatsApp needs Meta verification).
- In-web realtime chat (designed separately; see Appendix A).
- Mobile app changes, admin changes, analytics events.

## Design

### Component behaviour

`FloatingContact` (`apps/web/src/components/layout/floating-contact.tsx`)
becomes a client component:

- **Trigger:** the existing fixed bubble (bottom-right, `z-40`, `rounded-full`,
  `MessageCircleIcon`) becomes a `PopoverTrigger`. Visual style unchanged —
  tokens only, label from i18n.
- **Popover:** `Popover`/`PopoverContent` from `@tourism/ui` (Base UI — focus
  trap, Esc, outside-click handled). Content = a short title + one row per
  visible channel:
  - **WhatsApp** — external `<a>` (`target="_blank"`, `rel="noopener noreferrer"`)
    to the click-to-chat URL, built at click/open time.
  - **Send an enquiry** — Next `<Link href="/contact">`. Always present, so the
    popover is never empty.
- **Visibility:** `AppShell` already hides all floating chrome on auth
  `BARE_ROUTES`. Additionally the launcher hides itself (via `usePathname()`)
  on money-path routes: `/checkout/*` and `/tours/[slug]/book`.

### Pure logic (TDD)

New module `apps/web/src/lib/contact-launcher.ts`:

| Function | Contract |
| --- | --- |
| `getContactChannels(env)` | `{ whatsappPhone?: string }` → ordered channel descriptors; WhatsApp omitted when env missing/blank; enquiry always last. |
| `normalizeWhatsAppPhone(raw)` | strips `+`, spaces, dashes, brackets; returns digits or `null` if invalid (non-digits remain / too short). |
| `buildWhatsAppLink(phone, text?)` | `https://wa.me/<digits>` + `?text=<encodeURIComponent(text)>` when text present. Official format (WhatsApp FAQ 5913398998672934): international number, no `+`, zeros, or dashes. |
| `buildPrefill({ pathname, documentTitle, url })` | On `/tours/[slug]` pages: `Hi Nexora, I'm interested in "<tour title>" — <url>`, where tour title = `documentTitle` with the ` — Nexora` suffix stripped (page titles are single-branded `%s — Nexora`). Elsewhere: generic greeting. Copy comes from i18n message functions. |
| `isLauncherHidden(pathname)` | `true` for `/checkout` prefix and `^/tours/[^/]+/book$`. Auth routes stay AppShell's concern. |

Tour context comes from `document.title` + `window.location` **at interaction
time** — no server→client plumbing, no store, works with ISR pages.

### Config

- `NEXT_PUBLIC_CHAT_WHATSAPP` — phone in international digits (e.g.
  `84912345678`). Referenced statically (`process.env.NEXT_PUBLIC_CHAT_WHATSAPP`)
  per repo pattern so Next.js inlines it into the client bundle.
- Unset (all current environments): launcher renders with the enquiry channel
  only — behaviour equivalent to today's bubble, so shipping before the number
  exists is safe (owner creates the WhatsApp number later).

### i18n (EN-only, ADR-0005)

New `messages.contactLauncher` namespace: trigger label + aria-label, popover
title, channel labels/descriptions (`whatsapp`, `enquiry`), prefill message
functions `prefillGeneric` and `prefillTour(title, url)`.
`messages.nav.planTrip` stays for other call sites.

### Accessibility

Trigger: `aria-label`, visible focus ring (tokens). Popover: Base UI provides
role/focus/Esc. Channel rows are plain links — keyboard reachable, no custom
key handling. External link opens new tab; label announces the channel name.

### Testing

- `contact-launcher.spec.ts` — pure helpers, test-first (encoding incl.
  quotes/em-dash, phone normalization, channel filtering, hidden-route matrix,
  title-suffix stripping incl. titles containing ` — `).
- `floating-contact.spec.tsx` — renders trigger; popover shows both channels
  with env set, enquiry-only without; hidden on `/checkout/success` and
  `/tours/x/book`; WhatsApp href assertion. Mock the `@tourism/ui` barrel per
  existing convention (`auth-form-field.spec.tsx`) — it re-exports browser-only
  modules that crash under jsdom.
- No e2e addition; visual behaviour reviewed on the Vercel preview.

### Planned files

| File | Change |
| --- | --- |
| `apps/web/src/lib/contact-launcher.ts` (+ `.spec.ts`) | new — pure helpers |
| `apps/web/src/components/layout/floating-contact.tsx` (+ `.spec.tsx`) | upgrade to launcher |
| `libs/shared/i18n/src/lib/messages.ts` | add `contactLauncher` namespace |
| `docs/03-reference/*` env docs · `frontend.md` | docs sweep on merge (rule 9) |

### Risks

- **`document.title` coupling:** prefill depends on the `%s — Nexora` title
  convention; if metadata changes, prefill degrades to the raw document title —
  cosmetic only, tests pin the contract.
- **jsdom vs Base UI popover:** component test may need the barrel mock;
  fallback is asserting trigger/anchor rendering rather than open-state
  interaction.
- **No WhatsApp number yet:** mitigated by hide-when-unset; feature is inert
  until env is set in Vercel.

---

## Appendix — chat-direction research (2026-07-14, basis for phase 2)

### A. Three directions compared

| | External deep-link (this spec) | Business/Platform APIs | In-web chat (Supabase Realtime) |
| --- | --- | --- | --- |
| Cost | $0 | WhatsApp: service msgs free in 24h window, template msgs per-message (post-2025-07 pricing); Zalo: ZBS fees | Supabase free tier, Pro $25/mo if outgrown |
| Prereqs | none (personal number) | **Meta business verification / Zalo OA needs GPKD** | none |
| Data in our CRM | no (only enquiry channel is) | yes (webhook → admin inbox) | yes (own Postgres) |
| Ops | owner replies from phone | admin inbox + phone apps | someone must staff admin inbox (email fallback designed) |
| Verdict | **ship now** | when a registered business exists | phase 2; design agreed (below) |

### B. Phase-2 direction — LOCKED 2026-07-14: AI concierge chat (supersedes the human-chat design)

**Agreed with the owner (same day, after launch):** the in-web chat will be
**bot-first, not human-staffed** — humans stay on WhatsApp (this launcher is
the escalation path, prefill can carry chat context). Shape:

- **User ↔ AI bot** in a web chat panel (the `@tourism/ui` chat set: bubble ·
  message · message-scroller). No admin inbox surface, no Supabase
  Realtime/Broadcast needed — bot replies are API-streamed (SSE), which
  deletes the channels/subscribe-auth complexity from the superseded design.
- **Anonymous-first**: guests chat immediately; the bot collects name/email
  **conversationally and transparently** (consent-based) → qualified
  conversations convert to the existing **`Enquiry`** CRM model (no new admin
  UI). Logged-in users: bot personalizes via the user's OWN data through
  existing authorized API endpoints (JWT) — never raw DB into the prompt.
- **Guardrails**: read-only tool calls (tour search/detail, FAQ/policy);
  no price promises or bookings — anything binding defers to WhatsApp or the
  booking flow; rate-limited (LLM cost + abuse).
- **Open at spec time**: LLM provider/cost (chat volume is tiny — cheap tier
  or free tier), LLM call placement (NestJS API + SSE vs Next route handler +
  AI SDK `useChat`), guest identity (Supabase anonymous sign-in vs simple
  conversation token — write security now lives in the API either way).

<details><summary>Superseded human-chat design (kept for reference)</summary>

Broadcast (private channels) **not** `postgres_changes` (single-threaded,
per-subscriber RLS auth: ~30 changes/s at 500 clients); **writes through the
NestJS API** (Supabase = replaceable realtime transport → no lock-in; RLS
surface shrinks to subscribe-auth); anonymous sign-in (30/h/IP rate limit,
Turnstile recommended, no auto-cleanup → GC cron); offline fallback via pg-boss
outbox email. Quotas (fetched 2026-07-14): Free = 200 concurrent conns,
2M msgs/mo, 100 msg/s, 50k MAU (anon included), 500 MB DB; Pro = 500 conns
(10k with spend cap off), 5M msgs/mo. Free tier is ~20× current needs if the
socket connects only when the chat panel opens.

</details>

### C. Messaging-app market × Vietnam inbound (2025: 21.2M arrivals)

China #1 (25%, WeChat — closed ecosystem, skip) · Korea #2 (KakaoTalk — needs
KR registration; Open Chat possible later) · Taiwan #3 + Japan #5 (LINE —
add-friend link possible later) · US #4 + Australia #10 (Messenger `m.me` —
needs only a free Facebook Page; **first candidate to enable next**) · India #6,
Malaysia #9, Europe (fastest-growing region, +37.8%) (**WhatsApp** — this spec) ·
Russia #8 (Telegram — deferred, owner account banned). WhatsApp leads in 70/100
countries, 3.3B MAU.
