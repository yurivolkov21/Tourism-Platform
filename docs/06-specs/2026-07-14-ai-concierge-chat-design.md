# AI Concierge Chat — design spec

**Date:** 2026-07-14 · **Scope:** `@tourism/api` + `@tourism/web` (+ `@tourism/ui` reuse, `@tourism/i18n`) · **Status:** DRAFT (awaiting user review)

## Goal & Scope

Phase 2 of the chat direction (locked 2026-07-14, contact-launcher spec §B):
an **AI concierge** on the web — visitors chat with a bot that answers from
real tour data, captures leads into the existing `Enquiry` CRM with explicit
consent, personalizes for logged-in users, and hands off to a human via the
already-shipped WhatsApp launcher. **No human-staffed inbox, no realtime
infra** — bot replies stream over SSE from the NestJS API.

### Locked decisions

1. **LLM:** Claude **Haiku 4.5** (`claude-haiku-4-5`, $1/$5 per MTok — est.
   $1–3/mo at capstone traffic) via **Vercel AI SDK** (provider-agnostic —
   switching providers later is a config change). Direct `@ai-sdk/anthropic`
   with our own `ANTHROPIC_API_KEY`; no AI Gateway (API runs on Render, not
   Vercel).
2. **LLM call lives in the NestJS API** (AI SDK core + SSE). Key stays on
   Render; persistence, rate-limiting, and tool-calls (internal service calls)
   live with the rest of the business logic. Web consumes with `useChat`.
3. **Guest identity = simple conversation token** (uuid in `localStorage`).
   No Supabase anonymous sign-in (write security lives in the API — YAGNI).
   Logged-in users' conversations additionally bind to `userId` via JWT.
4. **Guardrails:** read-only tools (tour search/detail incl. per-tour
   FAQs/policies); the ONLY write is consent-gated enquiry creation; no price
   promises/bookings — anything binding defers to WhatsApp or the booking
   flow; throttled per IP; capped output tokens/steps/history.
5. AI SDK **v7** (`ai@7.0.22`, verified from bundled docs 2026-07-14):
   `tool({inputSchema})` (zod), `stopWhen: stepCountIs(n)`,
   `pipeUIMessageStreamToResponse({response})` for Express, `useChat` +
   `DefaultChatTransport`. v7 is **ESM-only, Node ≥22** — see Risks.

### Out of scope

- Mobile app chat; admin conversation viewer (future: read via Prisma Studio
  or a later admin wave); attachments/images in chat; RAG/embeddings (tool
  calls over live DB are sufficient at this catalog size); analytics.

## Architecture

```text
apps/web  ChatPanel ('use client')                apps/api  ChatModule
┌───────────────────────────────┐   POST /api/v1/chat/messages (SSE)
│ useChat (@ai-sdk/react)       │ ────────────────────────────────────▶
│  DefaultChatTransport         │   { messages: UIMessage[],           │
│  api = <API>/api/v1/chat/...  │     conversationId? }                │
│  + Authorization: Bearer JWT  │                                      ▼
│    (only when logged in)      │   ChatController (@Public, Throttler)
│ UI: @tourism/ui bubble/message│     └─ ChatService
│     message-scroller + input  │         ├─ resolve/create Conversation
└───────────────────────────────┘         ├─ system prompt (builder, pure)
        ▲   UIMessage stream (SSE)        ├─ streamText({ anthropic(model),
        └─────────────────────────────────│    tools, stopWhen, maxOutputTokens })
                                          │    tools → ToursService /
                                          │            EnquiryService (in-proc)
                                          └─ onFinish → persist messages
```

### Data model (Prisma — house conventions)

```prisma
model ChatConversation {
  id        String   @id @default(uuid()) @db.Uuid   // doubles as the guest bearer token
  userId    String?  @map("user_id") @db.Uuid         // set when created by a logged-in user
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  user     User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  messages ChatMessage[]
  @@index([userId])
  @@map("chat_conversations")
}

model ChatMessage {
  id             String   @id @default(uuid()) @db.Uuid
  conversationId String   @map("conversation_id") @db.Uuid
  role           ChatRole                                  // USER | ASSISTANT
  parts          Json                                      // UIMessage.parts verbatim (text + tool parts)
  createdAt      DateTime @default(now()) @map("created_at")
  conversation ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId, createdAt])
  @@map("chat_messages")
}
```

`parts Json` stores the AI SDK `UIMessage.parts` array verbatim — lossless
(tool calls included), replayable into `useChat`, and schema-stable across SDK
versions. History cap: last **20** messages sent to the model per request.

### API surface (ChatModule)

| Endpoint | Auth | Behavior |
| --- | --- | --- |
| `POST /api/v1/chat/messages` | `@Public` + optional JWT | Body `{ messages, conversationId? }`. Resolves conversation (creates when absent → id returned in stream metadata/header). **Ownership check:** conversation with `userId` requires matching JWT; guest conversation = knowledge of uuid. Streams UIMessage SSE via `@Res() res` + `pipeUIMessageStreamToResponse` (raw `res` bypasses the global `TransformInterceptor` envelope — first SSE surface in the API). `onFinish` persists the new user + assistant messages. |
| `GET /api/v1/chat/conversations/:id/messages` | `@Public` + optional JWT | Replay history (same ownership rule) so the panel restores after reload. |

**Rate limiting (copy the enquiry precedent):** `ThrottlerGuard` on the
controller, `@Throttle` ~**10 msgs/min per IP** on POST; plus server caps:
`maxOutputTokens ≈ 800`, `stopWhen: stepCountIs(4)`, history 20, message body
≤ 2000 chars, ≤ 200 messages per conversation. This bounds worst-case spend
per request regardless of client behavior.

### Bot tools (all execute in-process against existing services)

| Tool | Backs onto | Notes |
| --- | --- | --- |
| `searchTours` | `ToursService.findPublicList` | zod input: `search?`, `category?`, `destination?`, `featured?`, page capped at 5 results; returns trimmed summaries (title, slug, price, duration, rating). |
| `getTourDetails` | `ToursService.findPublicBySlug` | Returns trimmed detail incl. **itinerary, per-tour FAQs, policies** (this is where FAQ/policy answers come from — they live per-tour in the DB, no site-wide FAQ model). Strips ids/media noise to keep tokens down. |
| `submitEnquiry` | `EnquiryService.create` | The ONLY write. zod schema mirrors `CreateEnquiryDto` (name, email, message, optional tour/travel date/group size…). System prompt: collect conversationally, **ask permission before submitting**, then confirm. Reuses the outbox email + CRM pipeline as-is. |

### System prompt (pure builder, TDD)

`buildSystemPrompt({ user?, todayISO })` — brand persona (Nexora concierge,
EN), grounding rules ("answer ONLY from tool results; if unsure say so"),
guardrails (no price promises — quote listed prices as "from …, subject to
availability"; no bookings — link `/tours/<slug>/book`; anything binding or
sensitive → suggest the WhatsApp channel in the floating contact button),
lead-capture etiquette (transparent, consent-first), personalization block
when `user` present (greet by `fullName`; logged-in context only — the bot
gets the user's name from the verified JWT, never queries other users).
Personalization stays prompt-level in this wave (no bookings tool) — the
JWT-scoped bookings tool is a future increment.

### Web UI (ChatPanel)

- **Entry:** new channel row "Chat with us" at the TOP of the existing
  Contact Launcher popover (config-driven list from phase 1 — this is a new
  channel entry, not a new mount) → opens a **Sheet** (`@tourism/ui`, exists)
  anchored right/bottom with the chat.
- **Components:** `MessageScroller*` (autoscroll + jump-to-latest) ·
  `Message`/`MessageContent` + `Bubble` (user=end/tinted, bot=start/muted) ·
  bot markdown via `react-markdown` + `remark-gfm` (already in web) · typing
  indicator while streaming · tool activity rendered as a subtle `Marker`
  ("Searching tours…") · error state with retry (useChat `status`/`error`).
- **Transport:** `DefaultChatTransport({ api: <API_BASE>/api/v1/chat/messages })`
  + `Authorization` header from the client Supabase session when present +
  `conversationId` in body. Conversation id persisted in `localStorage`
  (`nexora.chat.conversation`); "Start over" clears it.
- **Copy** via new `messages.chatBot` i18n namespace (EN-only, ADR-0005):
  panel title, greeting/suggested first questions (3 chips: "Find me a
  tour" · "What's included in …" · "Talk to a human"), input placeholder,
  disclaimer line ("AI assistant — may make mistakes; tap WhatsApp for a
  human"), error/retry.
- Launcher/panel stays hidden on the money-path (phase-1 rule unchanged).

### Config / env

| Var | Where | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Render + `apps/api/.env` | secret; read by `@ai-sdk/anthropic` default |
| `CHAT_MODEL` | Render (optional) | default `claude-haiku-4-5`; provider swap = model string + key |
| (reuses) `NEXT_PUBLIC_API_BASE_URL` | web | transport target |

### Testing

- **TDD (pure logic):** `buildSystemPrompt` (persona/guardrail/personalization
  markers) · tool zod schemas + result trimmers (tours → summaries; detail →
  token-lean shape) · conversation ownership rule (`assertOwnership(convo,
  user?)` matrix: guest/guest, guest/user, owned/wrong-user, owned/right-user)
  · history windowing (last 20).
- **Service tests** with mocked `'ai'` module (jest CJS can't load the
  ESM-only package — mock via factory, same idiom as mobile's reanimated
  mocks) and mocked Prisma/Tours/Enquiry services: persistence on finish,
  conversation create/resolve, throttle config present.
- **Web:** ChatPanel component tests (mock `@ai-sdk/react` useChat + `@tourism/ui`
  barrel): renders greeting chips, sends message, renders text + tool marker
  parts, error state. Pure helper for localStorage conversation id.
- **e2e:** one API e2e hitting POST /chat/messages with a mocked model
  (AI SDK `MockLanguageModel` if available — verify at execution; else skip
  e2e, covered by service tests). Live behavior verified on deployed envs
  per house rule.

### Planned files

| Area | Files |
| --- | --- |
| API | `modules/chat/{chat.module,chat.controller,chat.service}.ts` · `chat/tools.ts` (+spec) · `chat/system-prompt.ts` (+spec) · `chat/ownership.ts` (+spec) · `dto/send-messages.dto.ts` · Prisma migration (2 models + `ChatRole` enum) |
| Web | `components/chat/chat-panel.tsx` (+spec) · `components/chat/use-conversation-id.ts` (+spec) · launcher: add channel row · `lib/supabase` client token helper reuse |
| Shared | `libs/shared/i18n`: `chatBot` namespace |
| Docs | env runbook + `.env.example`s · this spec's STATUS · post-merge rule-9 sweep |

### Risks

1. **`ai` v7 is ESM-only; API compiles to CJS.** Mitigations: repo TS is
   `module/moduleResolution: nodenext` (resolves ESM exports for types); local
   Node 26 and Node ≥22.12 support `require(esm)` natively — **verify Render's
   Node version** (pin `NODE_VERSION` ≥22.12, prefer 24 LTS). Jest never loads
   the real package (mock factory). **Fallback if it bites: pin `ai@6`** —
   same verified surface (`inputSchema`, `stopWhen`, result-method stream
   helpers), CJS-compatible; swap is mechanical.
2. **First SSE surface in the API** — `TransformInterceptor`/`ValidationPipe`
   interplay; using `@Res()` raw response opts out of the envelope. Verify
   streaming works on Render (proxy buffering) early — T-first smoke task.
3. **Prompt injection via tool results/user text** — tools are read-only,
   enquiry is consent-gated + validated by `CreateEnquiryDto` server-side, no
   secrets in context; accepted residual risk documented for the capstone
   report (a selling point, not a hole).
4. **Cost runaway** — hard caps above; Anthropic console spend alert
   recommended (owner to-do).
5. **Guest token = conversation uuid** — knowing the uuid reads that thread
   (no PII beyond what the guest typed). Accepted for capstone; noted for a
   future hardening pass (separate secret or signed cookie).
