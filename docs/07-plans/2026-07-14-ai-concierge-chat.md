# AI Concierge Chat — implementation plan

**Spec:** [`docs/06-specs/2026-07-14-ai-concierge-chat-design.md`](../06-specs/2026-07-14-ai-concierge-chat-design.md)
**Branch:** `feat/ai-concierge-chat` · **Date:** 2026-07-14

## STATUS

- [ ] T0 deps + SSE/Render smoke (de-risk first)
- [ ] T1 Prisma models + migration
- [ ] T2 pure logic TDD (system prompt · ownership · trimmers/windowing)
- [ ] T3 bot tools (zod ↔ services)
- [ ] T4 ChatService + streaming endpoint
- [ ] T5 history endpoint + persistence tests
- [ ] T6 i18n `chatBot` namespace
- [ ] T7 web ChatPanel + launcher entry
- [ ] T8 env docs + owner to-dos
- [ ] T9 gate + adversarial review + e2e decision

**RESUME STATE:** spec + plan written; deps installed (`ai@7.0.22`,
`@ai-sdk/anthropic`, `zod` in api; `ai`, `@ai-sdk/react` in web) — no feature
code yet. Awaiting user review of spec + plan.

## Sequencing

T0 → T1 → T2 → T3 → T4 → T5 (API lane) · T6 → T7 (web lane, needs T4 shape
but can start after T0) · T8 → T9 last. TDD red→green inside T2/T3; service
tests land with T4/T5.

## Reused seams

- `ToursService.findPublicList/findPublicBySlug` (exported from `ToursModule`) — tools call in-process; public path already strips `costPrice`.
- `EnquiryService.create` + `CreateEnquiryDto` + outbox email — the lead-capture write, untouched.
- Throttler precedent: `enquiry.controller.ts` (`ThrottlerModule.forRootAsync` per-module + `@UseGuards(ThrottlerGuard)` + `@Throttle`).
- Auth: global `SupabaseJwtGuard` + `@Public()` + `@CurrentUser()` — optional-auth pattern (public route still gets `req.currentUser` when a valid JWT is sent — verify guard populates on public routes; if not, small guard tweak is in-scope for T4).
- Prisma conventions from `Enquiry` model; migration via `prisma migrate`.
- Web: `@tourism/ui` Sheet/Bubble/Message/MessageScroller/Marker · `react-markdown`+`remark-gfm` · `NEXT_PUBLIC_API_BASE_URL` · client Supabase session for JWT · contact-launcher channel list (phase-1 seam).
- Jest idioms: mock ESM-only `'ai'` via factory (mobile reanimated precedent); `@tourism/ui` barrel mock in web specs.

## Tasks

### T0 — deps sanity + first-SSE smoke (de-risk)

Deps already added. Verify: `pnpm nx typecheck @tourism/api` resolves `ai`
imports under `nodenext`; add a **throwaway** `GET /chat/ping-stream` handler
streaming 3 SSE chunks via `@Res()`, run the API locally once (`nx serve`) to
confirm the global interceptor/prefix don't interfere, then delete the
handler (keep the learning in the service comment). Check Render Node version
(`NODE_VERSION` env ≥ 22.12, prefer 24) — record in T8 owner to-dos.
**Fallback trigger:** if `require(esm)` or typecheck fails → pin `ai@6` +
result-method helpers (spec Risk 1), adjust imports, continue.

**Accept:** typecheck green with `ai` imported in one file; streaming smoke
observed locally; decision (v7 stays / v6 pinned) written into this STATUS.

### T1 — Prisma: `ChatConversation` + `ChatMessage` + `ChatRole`

Schema per spec (house conventions; `parts Json`). `prisma migrate dev`
(local), name `add_chat_conversations`. No RLS work (API-only access path).

**Accept:** migration applies clean on local DB; `prisma migrate status` clean; typecheck green.

### T2 — pure logic, test-first (red → green per unit)

`modules/chat/system-prompt.ts` · `ownership.ts` · `shape.ts`:
- `buildSystemPrompt({ user?, todayISO })`: asserts persona line, grounding
  rule, no-price-promise + WhatsApp-deferral text, consent-first enquiry rule;
  with `user` → greeting-by-name block present; without → absent.
- `assertOwnership(convo, user?)`: guest convo + anyone-with-id → ok; convo
  with userId + no JWT → deny; wrong user → deny; matching → ok (throws
  `ForbiddenException`-shaped error object; controller maps).
- `windowHistory(messages, 20)` and result trimmers `toTourSummary`,
  `toTourDetailForBot` (drop ids/media/urls except slug; keep faqs/policies/
  itinerary text; cap list to 5).

**Accept:** new specs fail first, then green; `pnpm nx test @tourism/api` green.

### T3 — bot tools

`modules/chat/tools.ts`: `buildChatTools({ toursService, enquiryService })` →
`{ searchTours, getTourDetails, submitEnquiry }` using `tool({ description,
inputSchema: z..., execute })`. `submitEnquiry` maps zod input →
`CreateEnquiryDto` fields and relies on service validation; description text
encodes "only after explicit user consent". Unit tests with service mocks:
input→service-args mapping, trimmed outputs, enquiry returns confirmation id.

**Accept:** tests green; no direct Prisma access from tools (services only).

### T4 — ChatService + `POST /chat/messages`

`ChatModule` (imports Tours/Enquiry modules + per-module Throttler like
enquiry). Controller: `@Public()` + `@UseGuards(ThrottlerGuard)` +
`@Throttle(10/60s)`; DTO validates `messages` (≤2000 chars each) +
`conversationId?` uuid. Service: resolve/create conversation (bind `userId`
when `@CurrentUser()` present) → ownership check → window history →
`streamText({ model: anthropic(CHAT_MODEL), system, messages:
convertToModelMessages(...), tools, stopWhen: stepCountIs(4),
maxOutputTokens: 800 })` → UIMessage stream piped to `@Res()` response with
`x-conversation-id` header (+ id in stream metadata) → `onFinish` persists
user+assistant `parts`. Enforce ≤200 msgs/convo (410-style refusal). Exact v7
helper names verified against `node_modules/ai/docs` at implementation time.

**Accept:** service spec (mocked `'ai'`) covers create/resolve, ownership
deny, persistence on finish, caps; manual curl SSE smoke locally; lint/module
boundaries green.

### T5 — history endpoint

`GET /chat/conversations/:id/messages` (same ownership rule) returning
persisted `parts` in `useChat`-loadable shape. Service spec for mapping +
ownership; controller wiring.

**Accept:** tests green; response shape matches what ChatPanel replays.

### T6 — i18n `chatBot` namespace

Title, greeting, 3 suggestion chips, placeholder, disclaimer, error/retry,
"Start over", tool-activity labels ("Searching tours…", "Preparing your
enquiry…"). EN-only.

**Accept:** `pnpm nx typecheck @tourism/i18n` green.

### T7 — web ChatPanel + launcher channel

- `use-conversation-id.ts` (+spec): localStorage get/create/reset.
- `chat-panel.tsx`: Sheet + MessageScroller + Bubble/Message + markdown +
  chips + input (`useChat` + `DefaultChatTransport` with api URL, JWT header
  from client Supabase session when present, `conversationId` body); render
  text parts + tool parts as `Marker` labels; error + retry; "Talk to a human"
  chip deep-links the existing WhatsApp channel when configured.
- Launcher: prepend "Chat with us" channel row opening the panel (channel
  list seam from phase 1); a11y (focus, labels); tokens only.
- Component specs (mock `@ai-sdk/react` + barrel): greeting renders, send
  calls sendMessage, parts render, error state.

**Accept:** `pnpm nx test @tourism/web` green; lint/boundaries green.

### T8 — env + docs touch-points

`apps/api/.env.example` + env runbook: `ANTHROPIC_API_KEY` (secret),
`CHAT_MODEL` (optional). Owner to-dos recorded in HANDOFF at merge: set key on
Render · pin `NODE_VERSION` · set Anthropic console spend alert.

**Accept:** grep shows vars documented.

### T9 — gate + adversarial review

Kill orphan node → `pnpm nx affected -t lint typecheck test build`. Then
**adversarial review by a strong-tier subagent is MANDATORY** (standing rule:
this touches a public unauthenticated endpoint that spends money + writes to
CRM): focus prompt-injection→tool abuse, ownership bypass, throttle bypass,
cost caps, SSE resource leaks. Fix findings. e2e decision: add mocked-model
e2e if AI SDK test helper available, else document skip. **STOP — report to
user before any merge/push.**

**Accept:** gate green; review findings addressed; report includes test-count
deltas (baselines: api 499 · web 291).

## Post-merge (rule 9)

CHANGELOG entry · CLAUDE.md rows (api + web) · HANDOFF (baselines + owner
to-dos above) · `backend.md` (ChatModule) + `frontend.md` (ChatPanel) ·
roadmap · spec STATUS → SHIPPED · consider ADR for "first SSE surface + LLM
integration idiom" if review surfaces reusable rules.
