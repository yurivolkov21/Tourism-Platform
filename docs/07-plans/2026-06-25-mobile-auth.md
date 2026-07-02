# Implementation plan — Mobile auth (P5 increment-1)

> Spec: [`2026-06-25-mobile-auth-design.md`](../06-specs/2026-06-25-mobile-auth-design.md)
> Branch: `feat/mobile-auth` · TDD on pure helpers · one commit per task group.

## Reused seams

- `@tourism/core` `createApiClient` — powers `syncUser()` Bearer-token call.
- `@tourism/tokens` color values (read raw from design-direction doc) → `src/lib/theme.ts`.
- Supabase project already live (`zxryyqhczgrbidjocwly`, region SG) — same project as web/admin.

## Tasks

### T0 — Branch + Expo Router migration  ·  commit "chore(mobile): migrate to Expo Router v4"

1. `git checkout -b feat/mobile-auth`
2. Add packages to `apps/mobile/package.json`:
   `expo-router ~4.0.0`, `expo-secure-store ~14.0.0`,
   `react-native-safe-area-context ^5.4.0`, `react-native-screens ^4.0.0`,
   `expo-constants ~17.0.0`, `expo-linking ~7.0.0`,
   `react-native-qrcode-svg ^7`, `expo-clipboard ~7.0.0`,
   `@supabase/supabase-js ^2.50.0`.
3. Add `pnpm-workspace.yaml` allowBuilds for any new native packages if needed.
4. `pnpm install` from repo root.
5. Edit `apps/mobile/package.json`: add `"main": "expo-router/entry"`.
6. Edit `apps/mobile/app.json`:
   - Change `"scheme"` to `"nexora"`.
   - Add `"plugins": [...]` entry for `expo-router` with origin.
7. Delete `apps/mobile/src/app/App.tsx` (scaffold, no real content).
8. Delete `apps/mobile/src/app/App.spec.tsx` (scaffold test).
9. Create `apps/mobile/app/` directory structure (Expo Router root):
   - `app/_layout.tsx` — root layout (SplashScreen, fonts, AuthProvider gate)
   - `app/+not-found.tsx` — 404 fallback
10. Update `apps/mobile/index.js` → `export { default } from 'expo-router/entry';`
    (or just leave it, Expo Router picks up `main` field automatically).
11. Create `apps/mobile/.env.example`:
    ```
    EXPO_PUBLIC_SUPABASE_URL=
    EXPO_PUBLIC_SUPABASE_ANON_KEY=
    EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
    ```

**Accept:** `pnpm nx build @tourism/mobile` (or `start`) compiles; Expo Router
resolves the `app/` directory; no duplicate entry-point warnings.

---

### T1 — Pure helpers (TDD)  ·  commit "test(mobile): auth helpers (TDD)"

Files: `apps/mobile/src/lib/auth/auth-helpers.ts` + `.spec.ts`

- **RED:** Write specs for:
  - `validateEmail('')` → `false`; `validateEmail('bad')` → `false`;
    `validateEmail('a@b.co')` → `true`
  - `validatePassword('short')` → `false`; `validatePassword('allower1')` → `false`;
    `validatePassword('AllGood1')` → `true`
  - `toAuthError({ message: 'Invalid login credentials' })` → `'Invalid email or password.'`
  - `toAuthError({ message: 'User already registered' })` → `'An account with this email already exists.'`
  - `toAuthError({ message: 'Email not confirmed' })` → `'Please verify your email before signing in.'`
  - `toAuthError({ message: 'For security purposes, you can only request this after...' })` →
    `'Too many requests. Please wait a moment and try again.'`
  - `toAuthError({ message: 'unknown XYZ' })` → `'Something went wrong. Please try again.'`
- **GREEN:** Implement `validateEmail`, `validatePassword`, `toAuthError`.

**Accept:** `nx test @tourism/mobile` — all 7+ specs pass; ≥80% coverage on helpers.

---

### T2 — Supabase client + theme  ·  commit "feat(mobile): supabase client + theme"

1. `src/lib/supabase/client.ts` — `createClient` with `ExpoSecureStoreAdapter`
   (see spec). Export singleton `supabase`.
2. `src/lib/theme.ts` — color palette + spacing + radius constants (see spec).
3. `src/lib/strings.ts` — EN string constants for all auth screen copy
   (titles, labels, placeholders, CTAs, error messages, links).
4. `src/lib/api/sync-user.ts` — `syncUser(accessToken)` → `POST /auth/sync`
   via `@tourism/core` `createApiClient`.

**Accept:** typecheck green; `supabase` module imports without crashing;
`syncUser` type-checks against the `@tourism/core` client types.

---

### T3 — Auth provider  ·  commit "feat(mobile): AuthProvider + useAuth"

File: `src/providers/auth-provider.tsx`

- `AuthProvider` wraps children; reads `supabase.auth.getSession()` on mount;
  subscribes `onAuthStateChange` for live updates.
- `AuthContextValue`: `session`, `user`, `isLoading`, `signIn`, `signUp`, `signOut`.
- `signIn`: `supabase.auth.signInWithPassword` → check MFA requirement →
  either route to `2fa` or `syncUser` + navigate to `/(tabs)`.
- `signUp`: `supabase.auth.signUp` → navigate to `/(auth)/verify?email=`.
- `signOut`: `supabase.auth.signOut` → navigate to `/(auth)/login` (replace).
- `useAuth()` hook — throws if used outside `AuthProvider`.
- Wire into `app/_layout.tsx`: root layout reads `session` from the provider and
  uses `<Slot>` to conditionally show `(auth)` vs `(tabs)` group.

**Accept:** typecheck green; `AuthProvider` mounts without crash; navigation
redirects work in the emulator.

---

### T4 — UI atoms  ·  commit "feat(mobile): auth UI atoms"

Directory: `src/components/ui/`

- `AuthInput.tsx` — `TextInput` with label + error; uses `theme.colors`.
- `AuthButton.tsx` — `TouchableOpacity` primary / ghost variants.
- `OtpInput.tsx` — 6 cells; auto-advances focus; paste support; exposes `onComplete(code)`.
- `FormError.tsx` — red banner with error text.
- `KeyboardAvoid.tsx` — `KeyboardAvoidingView` + `ScrollView` wrapper for forms.
- `LogoMark.tsx` — SVG Nexora wordmark (inline SVG via `react-native-svg`).

**Accept:** components render in isolation (manual check or basic snapshot);
typecheck green.

---

### T5 — Auth screens  ·  commit "feat(mobile): auth screens (login/register/verify/forgot/reset/2fa)"

#### `app/(auth)/_layout.tsx`
Stack navigator; no header (`headerShown: false`); background = `theme.colors.surface`.

#### `app/(auth)/login.tsx`
- `AuthInput` for email + password (secureTextEntry).
- "Sign in" → `useAuth().signIn(email, password)`.
- Error display via `FormError`.
- Footer links: "Forgot password?" → `forgot-password`, "Create account" → `register`.

#### `app/(auth)/register.tsx`
- `AuthInput` for full name, email, password, confirm password.
- Client-side `validateEmail` + `validatePassword` before submit.
- "Create account" → `useAuth().signUp(email, password, fullName)`.
- Navigates to `verify?email=<email>` on success.

#### `app/(auth)/verify.tsx`
- Reads `email` from `useLocalSearchParams`.
- `OtpInput` (6 cells).
- On complete: `supabase.auth.verifyOtp({ email, token, type: 'email' })`
  → `syncUser()` → replace `/(tabs)`.
- "Resend code" button → `supabase.auth.resend({ type: 'signup', email })`.

#### `app/(auth)/forgot-password.tsx`
- `AuthInput` email.
- "Send reset link" → `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'nexora://auth/reset-password' })`.
- Success state: show confirmation card, hide form.

#### `app/(auth)/reset-password.tsx`
- On mount: read `access_token` from deep-link URL via `expo-linking`.
  If present, call `supabase.auth.setSession` to establish a session.
- `AuthInput` new password + confirm.
- "Set password" → `supabase.auth.updateUser({ password })` → replace `/(tabs)`.

#### `app/(auth)/2fa.tsx`
- Reads `factorId` from route params (pushed from `signIn` MFA branch).
- `OtpInput` for 6-digit TOTP code.
- On complete:
  1. `supabase.auth.mfa.challenge({ factorId })` → `challengeId`
  2. `supabase.auth.mfa.verify({ factorId, challengeId, code })`
  3. `syncUser()` → replace `/(tabs)`.
- Error: "Invalid code" message.

**Accept:** all 6 screens typecheck + render on Expo Go / emulator; navigation
flows work end-to-end with real Supabase credentials.

---

### T6 — Stub tab screens + protected gate  ·  commit "feat(mobile): tab stubs + auth gate"

#### `app/(tabs)/_layout.tsx`
- Bottom tab navigator; 4 tabs: Home, Tours, Wishlist, Account.
- Guard: if `!session` → `<Redirect href="/(auth)/login" />`.

#### `app/(tabs)/index.tsx` — "Home" stub
- "Coming soon — Nexora" banner + the `LogoMark`.

#### `app/(tabs)/tours.tsx` — "Tours" stub
- "Browse tours — coming soon" placeholder.

#### `app/(tabs)/wishlist.tsx` — "Wishlist" stub
- "Your saved tours — coming soon" placeholder.

#### `app/(tabs)/account.tsx` — Account stub
- Shows `user.email` + "Sign out" button → `useAuth().signOut()`.

**Accept:** logged-out tap → redirected to login; logged-in session → tab bar
visible; Account shows email + sign-out works.

---

### T7 — Gate  ·  commit "chore(mobile): gate pass"

- `pnpm nx lint @tourism/mobile` — clean.
- `pnpm nx typecheck @tourism/mobile` — 0 errors.
- `pnpm nx test @tourism/mobile` — all unit tests pass.
- Manual smoke test on Expo Go / emulator: register → verify → login → tab bar →
  account → sign out → back to login. Forgot-password email arrives. 2FA with
  an enrolled TOTP factor if available.

**STOP for review before merge/push.**

---

## Sequencing

```
T0 (branch + Expo Router migration)
  └─> T1 (TDD helpers, independent — can run in parallel with T2)
  └─> T2 (Supabase client + theme)
        └─> T3 (AuthProvider)
              └─> T4 (UI atoms, independent of T3 — can overlap)
              └─> T5 (auth screens — needs T3 + T4)
                    └─> T6 (tab stubs + gate)
                          └─> T7 (gate pass)
```

T1 and T2 can proceed in parallel after T0. T4 can proceed in parallel with T3.
T5 needs both T3 (context) and T4 (atoms). T6 needs T5.

## Out of scope (this increment)

TOTP enrollment UI; OAuth; phone OTP; real tab content (tours/wishlist/home);
push notifications; `@tourism/mobile-ui` component build-out; `@tourism/tokens`
RN output; i18n (`@tourism/i18n`) integration; booking flow.
