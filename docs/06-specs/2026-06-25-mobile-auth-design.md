# Design spec — Mobile auth (P5 increment-1: Auth flows)

> Status: draft for review · Branch: `feat/mobile-auth` · Date: 2026-06-25
> First real increment of `@tourism/mobile`. Migrates the Expo scaffold to
> **Expo Router v4**, wires **Supabase Auth**, and builds five auth flows:
> register → email-verify → login → forgot-password → 2FA (TOTP).

## Goal & scope

Give `@tourism/mobile` a working auth layer: email+password **register** with
**email OTP verification**, **login**, **forgot password** (request + reset),
and **2FA** (Supabase MFA/TOTP — enroll + challenge + verify). After any
successful auth the app calls `POST /api/v1/auth/sync` to mirror the user into
the local DB (same contract as the web app).

### How auth works (the contract)

Identical to the web:
1. All auth is handled by **Supabase Auth** client-side.
2. After sign-in / OTP-verify, call `POST /api/v1/auth/sync` with the access
   token → mirrors the user as CUSTOMER in the local DB.
3. Subsequent API calls carry the JWT as `Authorization: Bearer <token>`.

The API **does not issue tokens** — it only verifies Supabase JWTs.

### Locked decisions

- **Expo Router v4** — file-based routing (ships with Expo SDK 54); migrate
  from `registerRootComponent` + `App.tsx` to `app/_layout.tsx` entry.
  `main` field in `package.json` → `"expo-router/entry"`.
- **`@supabase/supabase-js`** — standard client; configure with
  `ExpoSecureStoreAdapter` for token persistence.
- **`expo-secure-store`** — secure persistent token storage (iOS Keychain /
  Android Keystore). Session tokens never touch AsyncStorage.
- **Email + password only** this increment. No OAuth / phone / magic link.
- **Email OTP verify** (not magic link): after register, Supabase sends a 6-digit
  OTP; user enters it in the Verify screen → `supabase.auth.verifyOtp`.
  Supabase project must have OTP email type enabled.
- **Forgot password**: `resetPasswordForEmail` with a deep-link
  `redirectTo: nexora://auth/reset-password` → the reset-password screen
  reads the token from the deep-link URL params and calls
  `supabase.auth.updateUser({ password })`.
- **2FA = Supabase MFA (TOTP)**: enroll (QR code via `react-native-qrcode-svg`
  + `expo-clipboard`), then per-sign-in challenge/verify if a factor is enrolled.
  TOTP is optional — not forced on login; users can enroll from the Account
  screen later (out of scope this increment — enroll screen deferred to P5.2).
  **This increment:** challenge + verify leg only, for users who already have
  a TOTP factor enrolled. The `AuthProvider` detects AAL2 requirement after
  sign-in and routes to the 2FA screen.
- **Env:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_API_BASE_URL`. `EXPO_PUBLIC_*` prefix is the Expo equivalent
  of `NEXT_PUBLIC_*` — safe, bundled at build time.
- **App scheme (deep links):** `nexora` (simpler than the current
  `@tourism/mobile` slug). Update `app.json` `scheme` → `"nexora"`.
- **Module boundaries:** Supabase client + auth helpers live in `apps/mobile/src`.
  No auth logic in `@tourism/mobile-ui` (that lib is UI primitives only).
  API sync uses `@tourism/core`'s `createApiClient` with Bearer token
  (app → shared data-access — allowed by boundary rules).
- **Design:** Minimal but on-brand. Use `@tourism/tokens` color values directly
  as RN stylesheet constants (tokens lib has no RN output yet — read raw values
  from the design direction doc). No `@tourism/mobile-ui` components yet
  (that lib is a scaffold — we build the auth screen components inline for now).

---

## Navigation architecture (Expo Router v4)

```
app/
  _layout.tsx            Root layout — AuthProvider, fonts, StatusBar
  +not-found.tsx         404 fallback
  (auth)/
    _layout.tsx          Auth stack (Stack navigator, no header chrome)
    login.tsx            Email + password sign-in
    register.tsx         Email + password + full name sign-up
    verify.tsx           Email OTP entry (after register; receives email param)
    forgot-password.tsx  Request password-reset email
    reset-password.tsx   Enter new password (opens via deep link)
    2fa.tsx              TOTP code entry (challenge + verify)
  (tabs)/
    _layout.tsx          Bottom tab bar — PROTECTED (redirect if !session)
    index.tsx            Home tab (stub: "Coming soon" banner)
    tours.tsx            Tours tab (stub)
    wishlist.tsx         Wishlist tab (stub, requires auth)
    account.tsx          Account tab (stub: shows email + sign-out)
```

Root `_layout.tsx` reads the Supabase session; if there's a valid session it
shows `(tabs)`, otherwise `(auth)`. No explicit redirect middleware (Expo
Router doesn't have Next.js middleware) — the root layout is the gate.

---

## Per-screen design

### Login (`(auth)/login.tsx`)
Fields: email, password. Actions: "Sign in" (→ `signIn`), "Forgot password?"
link (→ `forgot-password`), "Create account" link (→ `register`).
After `signIn` succeeds:
  - If MFA required (`AuthApiError.status === 200` + `mfa_level` check) → push
    `2fa` with `factorId`.
  - Else → `syncUser()` → replace route with `/(tabs)`.

### Register (`(auth)/register.tsx`)
Fields: full name, email, password, confirm password. Action: "Create account"
→ `signUp({ email, password, options: { data: { full_name } } })`.
On success: replace → `verify?email=<email>`.

### Verify (`(auth)/verify.tsx`)
Receives `email` query param. 6-digit OTP input (split into 6 `TextInput`
cells — `<OtpInput>` component). "Resend code" → `supabase.auth.resend`.
On `verifyOtp` success → `syncUser()` → replace → `/(tabs)`.

### Forgot password (`(auth)/forgot-password.tsx`)
Fields: email. Action: "Send reset link" → `supabase.auth.resetPasswordForEmail`.
On success: show a "Check your inbox" confirmation card (no navigation change).

### Reset password (`(auth)/reset-password.tsx`)
Opened via deep link `nexora://auth/reset-password?access_token=...` or Expo
deep-link handling. Fields: new password, confirm password. Action: "Set password"
→ `supabase.auth.updateUser({ password })` → replace → `/(tabs)`.

### 2FA (`(auth)/2fa.tsx`)
Receives `factorId` param. 6-digit TOTP code entry. Action: "Verify" →
`supabase.auth.mfa.challenge({ factorId })` → `supabase.auth.mfa.verify`.
On success → `syncUser()` → replace → `/(tabs)`.

---

## Auth context (`src/providers/auth-provider.tsx`)

```ts
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName: string): Promise<void>;
  signOut(): Promise<void>;
}
```

Seeded from `supabase.auth.getSession()` on mount; subscribed to
`supabase.auth.onAuthStateChange` for live updates. Exposes a `useAuth` hook.

---

## Supabase client (`src/lib/supabase/client.ts`)

```ts
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const ExpoSecureStoreAdapter = {
  getItem:    (key) => SecureStore.getItemAsync(key),
  setItem:    (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: ExpoSecureStoreAdapter, autoRefreshToken: true,
            persistSession: true, detectSessionInUrl: false } }
);
```

---

## API sync (`src/lib/api/sync-user.ts`)

```ts
export async function syncUser(accessToken: string): Promise<void> {
  const client = createApiClient({
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!,
    getToken: () => Promise.resolve(accessToken),
  });
  await client.POST('/auth/sync', { body: {} });
}
```

Uses `createApiClient` from `@tourism/core` (same as web).

---

## Design tokens (inline — `src/lib/theme.ts`)

The `@tourism/tokens` lib has no RN output yet. For this increment, define a
minimal `theme` const in `src/lib/theme.ts` using raw token values from the
Emerald Heritage palette (will be replaced with proper `@tourism/tokens` RN
output in P5.2):

```ts
export const theme = {
  colors: {
    primary:      '#2D6A4F',   // emerald-700
    primaryLight: '#52B788',   // emerald-400
    surface:      '#FFFFFF',
    surfaceAlt:   '#F8FAF9',
    border:       '#D8E8E0',
    textPrimary:  '#1A2E25',
    textSecondary:'#5C7A6A',
    textMuted:    '#8FA99A',
    error:        '#C0392B',
    errorBg:      '#FDF0EF',
  },
  radius: { sm: 8, md: 12, lg: 20 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
};
```

---

## Shared UI atoms (inline in `src/components/ui/`)

Built inline (not in `@tourism/mobile-ui` yet):
- `<TextInput>` wrapper (`AuthInput`) — themed, label, error state
- `<Button>` — primary / ghost variants
- `<OtpInput>` — 6 cells, auto-focus chain
- `<FormError>` — red error banner
- `<KeyboardAvoidingView>` wrapper
- `<LogoMark>` — SVG Nexora wordmark

---

## Deep linking setup

`app.json`:
```json
{
  "expo": {
    "scheme": "nexora",
    "intentFilters": [
      {
        "action": "VIEW",
        "data": [{ "scheme": "nexora" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

Supabase `resetPasswordForEmail` → `redirectTo: 'nexora://auth/reset-password'`.

---

## New packages (to add to `apps/mobile/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `expo-router` | `~4.0.0` | File-based routing |
| `@supabase/supabase-js` | `^2.50.0` | Supabase client |
| `expo-secure-store` | `~14.0.0` | Secure token storage |
| `react-native-safe-area-context` | `^5.4.0` | Expo Router peer dep |
| `react-native-screens` | `^4.x` | Expo Router peer dep |
| `expo-constants` | `~17.0.0` | `EXPO_PUBLIC_*` env access |
| `expo-linking` | `~7.0.0` | Deep link handling |
| `react-native-qrcode-svg` | `^7` | 2FA TOTP QR code display |
| `expo-clipboard` | `~7.0.0` | Copy TOTP secret for manual entry |

---

## i18n

No `@tourism/i18n` messages for mobile this increment — mobile uses its own
inline string constants in `src/lib/strings.ts` (EN-only; full `@tourism/i18n`
integration deferred to P5.2 when the web and mobile copy catalogs converge).

---

## Testing

- **Unit (TDD) — pure helpers:**
  - `validateEmail(s)` — basic email format check (no empty, has `@` + `.`)
  - `validatePassword(s)` — min 8 chars, 1 uppercase, 1 digit
  - `toAuthError(error)` — maps Supabase `AuthApiError` to a friendly EN string
    (invalid-credentials / email-taken / email-unconfirmed / too-many-requests / fallback)
- **Gate:** `nx lint @tourism/mobile` + `nx typecheck @tourism/mobile` +
  `nx test @tourism/mobile` green. No hex colors in `src/` (they're in
  `theme.ts` as documented exceptions — the web `check:no-hex` doesn't apply to mobile).

---

## In scope / out of scope

**In:** Expo Router migration; Supabase client + SecureStore; login; register;
email OTP verify; forgot password + deep-link reset; 2FA TOTP challenge/verify;
`syncUser` after auth; stub tab screens; minimal on-brand UI atoms.

**Out:** TOTP enrollment UI (P5.2 — Account screen); OAuth / phone OTP / magic
link; real tab screen content; push notifications; booking flow; `@tourism/mobile-ui`
components (stays scaffold; authUI atoms live inline in `apps/mobile`).

---

## Risks / mitigations

- **Expo Router vs `registerRootComponent`** — the migration is one-way:
  delete `App.tsx` entry, change `main` to `expo-router/entry`. No rollback
  needed; the scaffold `App.tsx` has zero real content.
- **SecureStore key length limit (2048 bytes)** — Supabase tokens are well
  within limit; `supabase-js` v2 already manages chunking.
- **Deep link on Android (Intent Filters)** — test with `npx uri-scheme open`
  on device; emulator deep links may need ADB.
- **Email OTP not magic link** — Supabase project must have OTP email type
  configured (not "Confirm signup via link"). Must be set in Supabase Dashboard
  → Auth → Email Templates → OTP type.
- **2FA screen only handles challenge/verify** — if the user has no enrolled
  factor, the 2FA screen is never reached; enrollment is P5.2.
- **No real device test in CI** — RN unit tests run in Jest/jsdom; UI only
  testable on simulator/device manually.
