# P5 Mobile W3 — Auth & Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (this wave runs **inline** at the user's request — no implementation subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guest-first Supabase auth (sign-in/up/forgot modals), a real Account tab (profile + edit name + sign out), and a real wishlist (hearts on cards/detail + Saved tab) — per the approved spec [2026-07-07-p5-mobile-w3-auth-account-design.md](../06-specs/2026-07-07-p5-mobile-w3-auth-account-design.md).

**Architecture:** `@supabase/supabase-js` with the official Expo pattern (AsyncStorage session + AppState auto-refresh) behind an `AuthProvider` context; the typed API client finally gets its `getToken`. Wishlist is a `useWishlist()` hook (ids query + optimistic toggle) feeding a presentation-only `HeartButton` injected into `TourCard` via a new `heartSlot` prop. Saved/Account gate guests through a shared `AuthGate`.

**Tech Stack:** @supabase/supabase-js · @react-native-async-storage/async-storage · react-native-url-polyfill · TanStack Query · existing mobile-ui primitives.

## Global Constraints

- Branch `feat/mobile-w3-auth-account`, main checkout, inline execution. Never touch `origin/nghia`.
- **Expo Go-compatible only.** New deps this wave (all Go-safe): `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`.
- **No backend changes.** Endpoints used: `POST /api/v1/auth/sync` · `GET/PATCH /api/v1/users/me` · `GET /api/v1/wishlist/me` · `POST|DELETE /api/v1/wishlist/{tourId}`. The core client THROWS `ApiRequestError` on non-2xx.
- "Brand 100% + Structure native": Fraunces headings, existing primitives, modal auth (`presentation: 'modal'` + `slide_from_bottom`), device-polish checklist (hidden indicators via `Screen`, pressed states, ≥44dp targets/hitSlop, keyboard-safe forms).
- No hex colors; all copy via `@tourism/i18n` (web `auth.*` reused; new `mobile.authPrompts/account/saved/authErrors`). Straight quotes. Conventional Commits.
- TDD on pure logic; **all 72 existing tests (mobile 41 + mobile-ui 31) stay green**. `TourCardVm` gains a required `id` → fixtures updated where the VM is constructed.
- Gate = lint + typecheck + test (mobile `build` = EAS cloud, excluded).

---

### Task 1: Deps + env + Supabase client + jest setup

**Files:**
- Modify: `apps/mobile/package.json` (via CLI), `apps/mobile/.env`
- Modify: `apps/mobile/src/lib/env.ts` + `apps/mobile/src/lib/env.spec.ts`
- Create: `apps/mobile/src/lib/supabase.ts`
- Modify: `apps/mobile/src/test-setup.ts` (AsyncStorage jest mock)

**Interfaces:**
- Produces: `supabase` (configured client) · env exports `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WEB_URL` · `requireHttpOrigin(name, raw)` / `requireValue(name, raw)` validators.

- [ ] **Step 1: Install deps**

From `apps/mobile`:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: Env values**

Append to `apps/mobile/.env` (SUPABASE URL from the live project ref `zxryyqhczgrbidjocwly`; the anon key + deployed web origin are user-provided — copy from `apps/web`'s Vercel env / `.env.local` at execution time):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://zxryyqhczgrbidjocwly.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from the web app env>
EXPO_PUBLIC_WEB_URL=<deployed web origin, e.g. https://tourism-platform-web.vercel.app>
```

(These are `EXPO_PUBLIC_*` = public by definition — same values already ship in the web browser bundle.)

- [ ] **Step 3: Failing env spec**

Append to `apps/mobile/src/lib/env.spec.ts`:

```ts
import { requireHttpOrigin, requireValue } from './env';

describe('requireHttpOrigin', () => {
  it('accepts and trims an https origin', () => {
    expect(requireHttpOrigin('X', ' https://a.co/ ')).toBe('https://a.co');
  });
  it('throws with the var name when missing or malformed', () => {
    expect(() => requireHttpOrigin('EXPO_PUBLIC_WEB_URL', undefined)).toThrow(
      /EXPO_PUBLIC_WEB_URL/,
    );
    expect(() => requireHttpOrigin('X', 'not-a-url')).toThrow(/X/);
  });
});

describe('requireValue', () => {
  it('accepts a non-empty value and throws on blank', () => {
    expect(requireValue('K', ' abc ')).toBe('abc');
    expect(() => requireValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', '  ')).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });
});
```

Run: `pnpm nx test @tourism/mobile --testPathPatterns=env` → FAIL (not exported).

- [ ] **Step 4: Implement env extension**

Replace `apps/mobile/src/lib/env.ts`:

```ts
/** Validates an http(s) origin once at startup — fails loud instead of silent fetch errors. */
export function requireHttpOrigin(name: string, raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, '');
  if (!value || !/^https?:\/\/.+/.test(value)) {
    throw new Error(`${name} is missing or not an http(s) origin — set it in apps/mobile/.env`);
  }
  return value;
}

/** Validates a non-empty env value. */
export function requireValue(name: string, raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`${name} is missing — set it in apps/mobile/.env`);
  }
  return value;
}

/** Back-compat alias used by W1 tests/docs. */
export function resolveApiBaseUrl(raw: string | undefined): string {
  return requireHttpOrigin('EXPO_PUBLIC_API_BASE_URL', raw);
}

// Evaluated at import time. Under jest this only works because Nx auto-loads
// apps/mobile/.env into process.env (NX_LOAD_DOT_ENV_FILES) — run tests through nx.
export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
export const SUPABASE_URL = requireHttpOrigin(
  'EXPO_PUBLIC_SUPABASE_URL',
  process.env.EXPO_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = requireValue(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const WEB_URL = requireHttpOrigin(
  'EXPO_PUBLIC_WEB_URL',
  process.env.EXPO_PUBLIC_WEB_URL,
);
```

- [ ] **Step 5: Supabase client (official Expo pattern)**

`apps/mobile/src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Official Supabase Expo pattern: AsyncStorage session (SecureStore's 2KB/value
 * limit can't hold the session JSON; encrypted LargeSecureStore = deferred
 * hardening) + foreground-only token auto-refresh.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Registered once at module scope.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

Append to `apps/mobile/src/test-setup.ts`:

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add apps/mobile/package.json apps/mobile/.env apps/mobile/src/lib/env.ts apps/mobile/src/lib/env.spec.ts apps/mobile/src/lib/supabase.ts apps/mobile/src/test-setup.ts pnpm-lock.yaml
git commit -m "feat(mobile): supabase client + env plumbing (official Expo pattern)"
```

---

### Task 2: Auth validators + error mapping (TDD)

**Files:**
- Create: `apps/mobile/src/lib/auth.ts`
- Test: `apps/mobile/src/lib/auth.spec.ts`

**Interfaces:**
- Produces:

  ```ts
  type AuthErrorKey = 'invalidCredentials' | 'emailTaken' | 'weakPassword' | 'generic';
  type SignInErrors = Partial<Record<'email' | 'password', 'emailInvalid' | 'passwordRequired'>>;
  type SignUpErrors = Partial<Record<'fullName' | 'email' | 'password' | 'confirm',
    'nameRequired' | 'emailInvalid' | 'passwordTooShort' | 'confirmMismatch'>>;
  validateSignIn({ email, password }): SignInErrors;
  validateSignUp({ fullName, email, password, confirm }): SignUpErrors;
  validateForgot({ email }): Partial<Record<'email', 'emailInvalid'>>;
  mapAuthError(error: { message?: string } | null | undefined): AuthErrorKey;
  ```

- [ ] **Step 1: Failing spec**

`apps/mobile/src/lib/auth.spec.ts`:

```ts
import { mapAuthError, validateForgot, validateSignIn, validateSignUp } from './auth';

test('validateSignIn flags bad email and empty password', () => {
  expect(validateSignIn({ email: 'a@b.co', password: 'secret123' })).toEqual({});
  expect(validateSignIn({ email: 'nope', password: 'secret123' })).toEqual({
    email: 'emailInvalid',
  });
  expect(validateSignIn({ email: 'a@b.co', password: '' })).toEqual({
    password: 'passwordRequired',
  });
});

test('validateSignUp enforces name, email, 8+ password, matching confirm', () => {
  const ok = { fullName: 'Jane', email: 'a@b.co', password: 'secret123', confirm: 'secret123' };
  expect(validateSignUp(ok)).toEqual({});
  expect(validateSignUp({ ...ok, fullName: ' ' })).toEqual({ fullName: 'nameRequired' });
  expect(validateSignUp({ ...ok, password: 'short', confirm: 'short' })).toEqual({
    password: 'passwordTooShort',
  });
  expect(validateSignUp({ ...ok, confirm: 'different' })).toEqual({ confirm: 'confirmMismatch' });
});

test('validateForgot checks the email', () => {
  expect(validateForgot({ email: 'a@b.co' })).toEqual({});
  expect(validateForgot({ email: 'x' })).toEqual({ email: 'emailInvalid' });
});

test('mapAuthError translates supabase messages to copy keys', () => {
  expect(mapAuthError({ message: 'Invalid login credentials' })).toBe('invalidCredentials');
  expect(mapAuthError({ message: 'User already registered' })).toBe('emailTaken');
  expect(mapAuthError({ message: 'Password should be at least 6 characters.' })).toBe(
    'weakPassword',
  );
  expect(mapAuthError({ message: 'boom' })).toBe('generic');
  expect(mapAuthError(null)).toBe('generic');
});
```

Run: `pnpm nx test @tourism/mobile --testPathPatterns=auth.spec` → FAIL (module missing).

- [ ] **Step 2: Implement**

`apps/mobile/src/lib/auth.ts`:

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthErrorKey = 'invalidCredentials' | 'emailTaken' | 'weakPassword' | 'generic';

export type SignInErrors = Partial<
  Record<'email' | 'password', 'emailInvalid' | 'passwordRequired'>
>;
export type SignUpErrors = Partial<
  Record<
    'fullName' | 'email' | 'password' | 'confirm',
    'nameRequired' | 'emailInvalid' | 'passwordTooShort' | 'confirmMismatch'
  >
>;

export function validateSignIn(input: { email: string; password: string }): SignInErrors {
  const errors: SignInErrors = {};
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'emailInvalid';
  if (input.password === '') errors.password = 'passwordRequired';
  return errors;
}

export function validateSignUp(input: {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
}): SignUpErrors {
  const errors: SignUpErrors = {};
  if (input.fullName.trim() === '') errors.fullName = 'nameRequired';
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'emailInvalid';
  if (input.password.length < 8) errors.password = 'passwordTooShort';
  else if (input.confirm !== input.password) errors.confirm = 'confirmMismatch';
  return errors;
}

export function validateForgot(input: { email: string }): Partial<Record<'email', 'emailInvalid'>> {
  return EMAIL_RE.test(input.email.trim()) ? {} : { email: 'emailInvalid' };
}

/** Supabase auth error message → friendly copy key (defensive substring checks). */
export function mapAuthError(error: { message?: string } | null | undefined): AuthErrorKey {
  const message = error?.message?.toLowerCase() ?? '';
  if (message.includes('invalid login credentials')) return 'invalidCredentials';
  if (message.includes('already registered')) return 'emailTaken';
  if (message.includes('password should be')) return 'weakPassword';
  return 'generic';
}
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=auth.spec` → PASS (5).

```bash
git add apps/mobile/src/lib/auth.ts apps/mobile/src/lib/auth.spec.ts
git commit -m "feat(mobile): auth validators + supabase error mapping (TDD)"
```

---

### Task 3: i18n — authPrompts / account / saved / authErrors

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts` (inside `mobile`)

**Interfaces:**
- Produces: `messages.mobile.authPrompts/account/saved/authErrors` — every key later tasks reference. (`mobile.placeholders` stays until Task 8 removes it.)

- [ ] **Step 1: Add the sections**

Inside `mobile: { ... }` after `enquiry`:

```ts
    authPrompts: {
      wishlistReason: 'Sign in to save tours you love.',
      savedGateTitle: 'Save tours you love',
      savedGateBody: 'Sign in to keep a wishlist of tours and find them here anytime.',
      accountGateTitle: 'Your account',
      accountGateBody: 'Sign in to manage your profile and saved tours.',
      signIn: 'Sign in',
      createAccount: 'Create account',
      resetSentHint: 'Open the link on any device — you will set the new password on our website.',
    },
    authErrors: {
      invalidCredentials: 'Email or password is incorrect.',
      emailTaken: 'An account with this email already exists.',
      weakPassword: 'Password is too weak — use at least 8 characters.',
      generic: 'Something went wrong. Please try again.',
      nameRequired: 'Please enter your name.',
      emailInvalid: 'Please enter a valid email address.',
      passwordRequired: 'Please enter your password.',
      passwordTooShort: 'Use at least 8 characters.',
      confirmMismatch: 'Passwords do not match.',
    },
    account: {
      editNameLabel: 'Display name',
      editNameSave: 'Save',
      editNameSaving: 'Saving…',
      editNameSaved: 'Name updated.',
      editNameError: "Couldn't update your name. Please try again.",
      menuSaved: 'Saved tours',
      menuPrivacy: 'Privacy policy',
      menuTerms: 'Terms of service',
      signOut: 'Sign out',
      loadError: "Couldn't load your profile.",
      retry: 'Try again',
    },
    saved: {
      title: 'Saved tours',
      empty: 'Nothing saved yet — tap the heart on any tour.',
      browse: 'Browse tours',
      removeLabel: 'Remove from saved',
      heartSaveLabel: 'Save tour',
      heartUnsaveLabel: 'Remove from saved',
      error: "Couldn't load your saved tours.",
      retry: 'Try again',
    },
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/i18n` → green.

```bash
git add libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(i18n): mobile W3 copy - auth prompts/errors, account, saved"
```

---

### Task 4: AuthProvider + authed API client

**Files:**
- Create: `apps/mobile/src/lib/auth-context.tsx`
- Test: `apps/mobile/src/__tests__/auth-context.spec.tsx`
- Modify: `apps/mobile/src/lib/api.ts` (getToken)
- Modify: `apps/mobile/src/app/_layout.tsx` (mount provider)

**Interfaces:**
- Consumes: `supabase` (T1), `mapAuthError`/`AuthErrorKey` (T2).
- Produces:

  ```ts
  interface AuthContextValue {
    status: 'loading' | 'signedIn' | 'signedOut';
    user: { id: string; email?: string } | null;
    signIn(email: string, password: string): Promise<{ error?: AuthErrorKey }>;
    signUp(fullName: string, email: string, password: string):
      Promise<{ error?: AuthErrorKey; confirmationSent?: boolean }>;
    sendReset(email: string): Promise<{ error?: AuthErrorKey }>;
    signOut(): Promise<void>;
  }
  useAuth(): AuthContextValue;  // throws outside the provider
  ```

- [ ] **Step 1: getToken on the API client**

Replace `apps/mobile/src/lib/api.ts`:

```ts
import { createApiClient, type ApiClient } from '@tourism/core';
import { API_BASE_URL } from './env';
import { supabase } from './supabase';

let client: ApiClient | undefined;

/** App-wide typed API client. Guests get no Authorization header (token undefined). */
export function getApiClient(): ApiClient {
  client ??= createApiClient({
    baseUrl: API_BASE_URL,
    getToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
  });
  return client;
}
```

- [ ] **Step 2: AuthProvider**

`apps/mobile/src/lib/auth-context.tsx`:

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiClient } from './api';
import { mapAuthError, type AuthErrorKey } from './auth';
import { supabase } from './supabase';

export interface AuthContextValue {
  status: 'loading' | 'signedIn' | 'signedOut';
  user: { id: string; email?: string } | null;
  signIn(email: string, password: string): Promise<{ error?: AuthErrorKey }>;
  signUp(
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ error?: AuthErrorKey; confirmationSent?: boolean }>;
  sendReset(email: string): Promise<{ error?: AuthErrorKey }>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mirror the signed-in user into the API DB (idempotent; API 401s unsynced users otherwise). */
async function syncUser(fullName?: string): Promise<void> {
  try {
    await getApiClient().POST('/api/v1/auth/sync', {
      body: fullName ? { fullName } : {},
    });
  } catch {
    // Non-fatal: the next authed call surfaces a real error state if sync keeps failing.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [user, setUser] = useState<AuthContextValue['user']>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: mapAuthError(error) };
      await syncUser();
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      return {};
    },
    [queryClient],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (fullName, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: mapAuthError(error) };
      if (!data.session) return { confirmationSent: true }; // email-confirmation ON
      await syncUser(fullName);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      return {};
    },
    [queryClient],
  );

  const sendReset = useCallback<AuthContextValue['sendReset']>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? { error: mapAuthError(error) } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['wishlist'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, sendReset, signOut }),
    [status, user, signIn, signUp, sendReset, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
```

- [ ] **Step 3: Mount in the root layout**

In `apps/mobile/src/app/_layout.tsx`: `import { AuthProvider } from '../lib/auth-context';` and wrap ThemedStack:

```tsx
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <ThemedStack />
        </AuthProvider>
      </QueryClientProvider>
```

- [ ] **Step 4: Provider test**

`apps/mobile/src/__tests__/auth-context.spec.tsx`:

```tsx
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../lib/auth-context';

const mockGetSession = jest.fn();
const mockOnChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnChange(...args),
    },
  },
}));

function Probe() {
  const { status, user } = useAuth();
  return (
    <Text>
      {status}:{user?.email ?? 'none'}
    </Text>
  );
}

function renderProbe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

test('resolves signedOut when there is no session', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  renderProbe();
  expect(await screen.findByText('signedOut:none')).toBeOnTheScreen();
});

test('resolves signedIn with the user when a session exists', async () => {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: 'u1', email: 'jane@example.com' } } },
  });
  renderProbe();
  expect(await screen.findByText('signedIn:jane@example.com')).toBeOnTheScreen();
});
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add apps/mobile/src/lib/auth-context.tsx apps/mobile/src/__tests__/auth-context.spec.tsx apps/mobile/src/lib/api.ts apps/mobile/src/app/_layout.tsx
git commit -m "feat(mobile): AuthProvider + authed API client (supabase session token)"
```

---

### Task 5: Auth modal screens (sign-in · sign-up · forgot)

**Files:**
- Create: `apps/mobile/src/app/auth/sign-in.tsx`, `sign-up.tsx`, `forgot.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx` (register the three modal routes)
- Test: `apps/mobile/src/__tests__/auth-screens.spec.tsx`

**Interfaces:**
- Consumes: `useAuth` (T4), validators + `AuthErrorKey` (T2), `messages.auth.*` + `mobile.authPrompts/authErrors` (T3), `TextField`/`Button`/`Screen`.
- Produces: routes `/auth/sign-in` (`?reason=wishlist` renders the context line), `/auth/sign-up`, `/auth/forgot`.

- [ ] **Step 1: Register the routes**

In `_layout.tsx`'s `ThemedStack`, after the enquiry screen:

```tsx
        <Stack.Screen
          name="auth/sign-in"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="auth/sign-up"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="auth/forgot"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
```

- [ ] **Step 2: Sign-in screen**

`apps/mobile/src/app/auth/sign-in.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, TextField, useTheme } from '@tourism/mobile-ui';
import { validateSignIn, type SignInErrors } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.login;
const tp = messages.mobile.authPrompts;
const te = messages.mobile.authErrors;

export default function SignInScreen() {
  const theme = useTheme();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignInErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const validation = validateSignIn({ email, password });
    setErrors(validation);
    setBanner(null);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setBanner(te[result.error]);
    } else {
      router.back();
    }
  };

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          <AppText variant="body" muted>
            {reason === 'wishlist' ? tp.wishlistReason : t.subtitle}
          </AppText>
        </View>
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? te[errors.email] : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextField
          label={t.passwordLabel}
          value={password}
          onChangeText={setPassword}
          error={errors.password ? te[errors.password] : undefined}
          secureTextEntry
        />
        {banner ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
            {banner}
          </AppText>
        ) : null}
        <Button label={submitting ? t.submitting : t.submit} onPress={onSubmit} loading={submitting} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/forgot')}
            hitSlop={8}
          >
            <AppText variant="caption" style={{ color: theme.colors['primary'] }}>
              {t.forgotCta}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/auth/sign-up')}
            hitSlop={8}
          >
            <AppText variant="caption" style={{ color: theme.colors['primary'] }}>
              {t.noAccount} {t.registerCta}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
```

- [ ] **Step 3: Sign-up screen**

`apps/mobile/src/app/auth/sign-up.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, TextField, useTheme } from '@tourism/mobile-ui';
import { validateSignUp, type SignUpErrors } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.register;
const te = messages.mobile.authErrors;

export default function SignUpScreen() {
  const theme = useTheme();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const onSubmit = async () => {
    const validation = validateSignUp({ fullName, email, password, confirm });
    setErrors(validation);
    setBanner(null);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    const result = await signUp(fullName.trim(), email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setBanner(te[result.error]);
    } else if (result.confirmationSent) {
      setConfirmationSent(true);
    } else {
      router.back();
    }
  };

  if (confirmationSent) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <Ionicons name="mail-unread-outline" size={48} color={theme.colors['primary']} />
          <AppText variant="title">{t.checkInboxTitle}</AppText>
          <AppText variant="body" muted style={{ textAlign: 'center' }}>
            {t.checkInboxBody}
          </AppText>
          <Button label={messages.auth.forgot.backToLogin} onPress={() => router.replace('/auth/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          <AppText variant="body" muted>
            {t.subtitle}
          </AppText>
        </View>
        <TextField
          label={t.fullNameLabel}
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName ? te[errors.fullName] : undefined}
          autoCorrect={false}
        />
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? te[errors.email] : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextField
          label={t.passwordLabel}
          value={password}
          onChangeText={setPassword}
          error={errors.password ? te[errors.password] : undefined}
          secureTextEntry
        />
        <TextField
          label={t.confirmLabel}
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm ? te[errors.confirm] : undefined}
          secureTextEntry
        />
        {banner ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
            {banner}
          </AppText>
        ) : null}
        <Button label={submitting ? t.submitting : t.submit} onPress={onSubmit} loading={submitting} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/auth/sign-in')}
          hitSlop={8}
          style={{ alignSelf: 'center' }}
        >
          <AppText variant="caption" style={{ color: theme.colors['primary'] }}>
            {t.haveAccount} {t.loginCta}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Forgot screen**

`apps/mobile/src/app/auth/forgot.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, TextField, useTheme } from '@tourism/mobile-ui';
import { validateForgot } from '../../lib/auth';
import { useAuth } from '../../lib/auth-context';

const t = messages.auth.forgot;
const tp = messages.mobile.authPrompts;
const te = messages.mobile.authErrors;

export default function ForgotScreen() {
  const theme = useTheme();
  const { sendReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    const validation = validateForgot({ email });
    setError(validation.email ? te[validation.email] : null);
    setBanner(null);
    if (validation.email) return;
    setSubmitting(true);
    const result = await sendReset(email.trim());
    setSubmitting(false);
    if (result.error) {
      setBanner(te[result.error]);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <Ionicons name="mail-unread-outline" size={48} color={theme.colors['primary']} />
          <AppText variant="title">{t.sentTitle}</AppText>
          <AppText variant="body" muted style={{ textAlign: 'center' }}>
            {t.sentBody}
          </AppText>
          <AppText variant="caption" muted style={{ textAlign: 'center' }}>
            {tp.resetSentHint}
          </AppText>
          <Button label={t.backToLogin} onPress={() => router.replace('/auth/sign-in')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          <AppText variant="body" muted>
            {t.subtitle}
          </AppText>
        </View>
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={error ?? undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        {banner ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
            {banner}
          </AppText>
        ) : null}
        <Button label={submitting ? t.submitting : t.submit} onPress={onSubmit} loading={submitting} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/auth/sign-in')}
          hitSlop={8}
          style={{ alignSelf: 'center' }}
        >
          <AppText variant="caption" style={{ color: theme.colors['primary'] }}>
            {t.backToLogin}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
```

- [ ] **Step 5: Screen tests**

`apps/mobile/src/__tests__/auth-screens.spec.tsx`:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import SignInScreen from '../app/auth/sign-in';
import SignUpScreen from '../app/auth/sign-up';
import ForgotScreen from '../app/auth/forgot';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSendReset = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: 'signedOut',
    user: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
    sendReset: mockSendReset,
    signOut: jest.fn(),
  }),
}));

import { router } from 'expo-router';

function wrap(children: React.ReactNode) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

test('sign-in validates before calling supabase', async () => {
  wrap(<SignInScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
  expect(mockSignIn).not.toHaveBeenCalled();
});

test('sign-in success routes back; failure shows the banner', async () => {
  mockSignIn.mockResolvedValueOnce({});
  wrap(<SignInScreen />);
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(router.back).toHaveBeenCalled();

  mockSignIn.mockResolvedValueOnce({ error: 'invalidCredentials' });
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Email or password is incorrect.')).toBeOnTheScreen();
});

test('sign-in shows the wishlist reason line', () => {
  mockParams = { reason: 'wishlist' };
  wrap(<SignInScreen />);
  expect(screen.getByText('Sign in to save tours you love.')).toBeOnTheScreen();
});

test('sign-up shows confirm mismatch and the confirmation-sent state', async () => {
  mockSignUp.mockResolvedValueOnce({ confirmationSent: true });
  wrap(<SignUpScreen />);
  await userEvent.type(screen.getByLabelText('Full name'), 'Jane');
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.type(screen.getByLabelText('Confirm password'), 'different1');
  await userEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Passwords do not match.')).toBeOnTheScreen();

  await userEvent.clear(screen.getByLabelText('Confirm password'));
  await userEvent.type(screen.getByLabelText('Confirm password'), 'secret123');
  await userEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Check your inbox')).toBeOnTheScreen();
});

test('forgot sends and shows the sent state', async () => {
  mockSendReset.mockResolvedValueOnce({});
  wrap(<ForgotScreen />);
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByText('Check your inbox')).toBeOnTheScreen();
  expect(mockSendReset).toHaveBeenCalledWith('jane@example.com');
});
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add apps/mobile/src/app/auth apps/mobile/src/app/_layout.tsx apps/mobile/src/__tests__/auth-screens.spec.tsx
git commit -m "feat(mobile): auth modals - sign-in, sign-up, forgot (guest-first)"
```

---

### Task 6: Wishlist lib + `useWishlist` + `HeartButton` + card/detail wiring

**Files:**
- Create: `apps/mobile/src/lib/wishlist.ts` + `wishlist.spec.ts`
- Create: `apps/mobile/src/components/heart-button.tsx`
- Modify: `apps/mobile/src/lib/tours.ts` + `tours.spec.ts` (VM gains required `id`)
- Modify: `apps/mobile/src/components/tour-card.tsx` (`heartSlot` prop)
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`, `(tabs)/explore.tsx`, `tours/[slug]/index.tsx` (inject hearts)
- Modify (fixtures): `home.spec.tsx`, `explore.spec.tsx`, `explore-state.spec.ts`, `tour-card.spec.tsx`
- Test: `apps/mobile/src/__tests__/heart-button.spec.tsx`

**Interfaces:**
- Consumes: `useAuth` (T4), `getApiClient`, `messages.mobile.saved` (T3).
- Produces:

  ```ts
  interface SavedTourVm { tourId: string; slug: string; title: string; image?: string;
    basePrice: number; currency: string }
  toSavedTourVm(dto: WishlistItemDto): SavedTourVm;
  fetchSavedTours(): Promise<SavedTourVm[]>;
  fetchSavedTourIds(): Promise<string[]>;
  addToWishlist(tourId: string): Promise<void>;
  removeFromWishlist(tourId: string): Promise<void>;
  useWishlist(): { isGuest: boolean; isSaved(id: string): boolean; toggle(id: string): void };
  HeartButton({ tourId, size? });
  TourCardVm.id: string (required);
  TourCard({ …, heartSlot?: ReactNode });
  ```

- [ ] **Step 1: Failing wishlist mapper spec**

`apps/mobile/src/lib/wishlist.spec.ts`:

```ts
import type { components } from '@tourism/core';
import { toSavedTourVm } from './wishlist';

type WishlistItemDto = components['schemas']['WishlistItemDto'];

const dto = {
  tourId: 'uuid-1',
  tour: {
    slug: 'ha-long-cruise',
    title: 'Ha Long Bay Cruise',
    basePrice: '450.00',
    currency: 'USD',
    media: [
      { publicId: 'g', url: 'https://img.test/g.jpg', type: 'IMAGE', role: 'gallery' },
      { publicId: 'h', url: 'https://img.test/h.jpg', type: 'IMAGE', role: 'hero' },
    ],
  },
} as unknown as WishlistItemDto;

test('maps the saved tour VM with the hero image', () => {
  expect(toSavedTourVm(dto)).toEqual({
    tourId: 'uuid-1',
    slug: 'ha-long-cruise',
    title: 'Ha Long Bay Cruise',
    image: 'https://img.test/h.jpg',
    basePrice: 450,
    currency: 'USD',
  });
});

test('falls back to the first media, then undefined', () => {
  const noHero = {
    ...dto,
    tour: { ...dto.tour, media: [dto.tour.media[0]] },
  } as unknown as WishlistItemDto;
  expect(toSavedTourVm(noHero).image).toBe('https://img.test/g.jpg');
  const noMedia = { ...dto, tour: { ...dto.tour, media: [] } } as unknown as WishlistItemDto;
  expect(toSavedTourVm(noMedia).image).toBeUndefined();
});
```

Run: `pnpm nx test @tourism/mobile --testPathPatterns=wishlist` → FAIL.

- [ ] **Step 2: Implement the wishlist lib**

`apps/mobile/src/lib/wishlist.ts`:

```ts
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@tourism/core';
import { getApiClient } from './api';
import { useAuth } from './auth-context';

type WishlistItemDto = components['schemas']['WishlistItemDto'];

export interface SavedTourVm {
  tourId: string;
  slug: string;
  title: string;
  image?: string;
  basePrice: number;
  currency: string;
}

export function toSavedTourVm(dto: WishlistItemDto): SavedTourVm {
  const hero = dto.tour.media.find((m) => m.role === 'hero') ?? dto.tour.media[0];
  return {
    tourId: dto.tourId,
    slug: dto.tour.slug,
    title: dto.tour.title,
    image: hero?.url,
    basePrice: Number(dto.tour.basePrice),
    currency: dto.tour.currency,
  };
}

export async function fetchSavedTours(): Promise<SavedTourVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/wishlist/me');
  const list = (data as unknown as { data: WishlistItemDto[] }).data ?? [];
  return list.map(toSavedTourVm);
}

export async function fetchSavedTourIds(): Promise<string[]> {
  const items = await fetchSavedTours();
  return items.map((item) => item.tourId);
}

export async function addToWishlist(tourId: string): Promise<void> {
  await getApiClient().POST('/api/v1/wishlist/{tourId}', { params: { path: { tourId } } });
}

export async function removeFromWishlist(tourId: string): Promise<void> {
  await getApiClient().DELETE('/api/v1/wishlist/{tourId}', { params: { path: { tourId } } });
}

/** Wishlist state + optimistic toggle. Guests get `isGuest: true` and no queries. */
export function useWishlist() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const signedIn = status === 'signedIn';

  const idsQ = useQuery({
    queryKey: ['wishlist', 'ids'],
    queryFn: fetchSavedTourIds,
    enabled: signedIn,
  });
  const ids = idsQ.data ?? [];

  const toggleM = useMutation({
    mutationFn: ({ tourId, saved }: { tourId: string; saved: boolean }) =>
      saved ? removeFromWishlist(tourId) : addToWishlist(tourId),
    onMutate: async ({ tourId, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });
      const prevIds = queryClient.getQueryData<string[]>(['wishlist', 'ids']);
      const prevList = queryClient.getQueryData<SavedTourVm[]>(['wishlist', 'list']);
      queryClient.setQueryData<string[]>(['wishlist', 'ids'], (old = []) =>
        saved ? old.filter((id) => id !== tourId) : [...old, tourId],
      );
      if (saved) {
        queryClient.setQueryData<SavedTourVm[]>(['wishlist', 'list'], (old = []) =>
          old.filter((item) => item.tourId !== tourId),
        );
      }
      return { prevIds, prevList };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(['wishlist', 'ids'], context?.prevIds);
      queryClient.setQueryData(['wishlist', 'list'], context?.prevList);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const isSaved = useCallback((tourId: string) => ids.includes(tourId), [ids]);
  const toggle = useCallback(
    (tourId: string) => toggleM.mutate({ tourId, saved: ids.includes(tourId) }),
    [toggleM, ids],
  );

  return { isGuest: !signedIn, isSaved, toggle };
}
```

- [ ] **Step 3: `TourCardVm.id` + `heartSlot`**

`tours.ts`: `TourCardVm` gains `id: string;` (first field); `toTourCardVm` maps `id: dto.id,`. `tours.spec.ts`: dto fixture gains `id: 'uuid-1',`; the `toEqual` gains `id: 'uuid-1',`.

Fixtures gain `id`: `home.spec.tsx` vm (`id: 'uuid-1',`) · `explore.spec.tsx` + `explore-state.spec.ts` `tour()` base (`id: 'x',`) · `tour-card.spec.tsx` vm (`id: 'uuid-1',`).

`tour-card.tsx`: props gain `heartSlot?: ReactNode` (`import type { ReactNode } from 'react';`); inside the image `<View>` after the badges overlay:

```tsx
          {heartSlot ? (
            <View style={{ position: 'absolute', top: theme.spacing(2), right: theme.spacing(2) }}>
              {heartSlot}
            </View>
          ) : null}
```

(destructure `heartSlot` in the signature.)

- [ ] **Step 4: HeartButton**

`apps/mobile/src/components/heart-button.tsx`:

```tsx
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { useTheme } from '@tourism/mobile-ui';
import { useWishlist } from '../lib/wishlist';

const t = messages.mobile.saved;

/** Circular wishlist heart. Guests are routed to sign-in with the wishlist reason. */
export function HeartButton({ tourId, size = 32 }: { tourId: string; size?: number }) {
  const theme = useTheme();
  const { isGuest, isSaved, toggle } = useWishlist();
  const saved = !isGuest && isSaved(tourId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? t.heartUnsaveLabel : t.heartSaveLabel}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => {
        if (isGuest) {
          router.push('/auth/sign-in?reason=wishlist');
        } else {
          toggle(tourId);
        }
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['background'],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={Math.round(size * 0.55)}
        color={saved ? theme.colors['destructive'] : theme.colors['foreground']}
      />
    </Pressable>
  );
}
```

- [ ] **Step 5: Inject hearts**

- Home `renderItem`: `<TourCard tour={item} heartSlot={<HeartButton tourId={item.id} />} onPress={…} />`
- Explore `renderItem`: same with `variant="list"`.
- Detail (`tours/[slug]/index.tsx`): the badges overlay `<View>` becomes a row hosting the heart LEFT of the badges:

```tsx
          <View
            style={{
              position: 'absolute',
              top: insets.top + theme.spacing(2),
              right: theme.spacing(4),
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(2),
            }}
          >
            <HeartButton tourId={tour.id} />
            <TourBadges badges={tour.badges as TourBadge[]} />
          </View>
```

(imports gain `HeartButton`.)

- [ ] **Step 6: HeartButton test**

`apps/mobile/src/__tests__/heart-button.spec.tsx`:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { HeartButton } from '../components/heart-button';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

const mockUseWishlist = jest.fn();
jest.mock('../lib/wishlist', () => ({
  useWishlist: () => mockUseWishlist(),
}));

import { router } from 'expo-router';

function renderHeart() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <HeartButton tourId="uuid-1" />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

test('guest tap routes to sign-in with the wishlist reason', async () => {
  mockUseWishlist.mockReturnValue({ isGuest: true, isSaved: () => false, toggle: jest.fn() });
  renderHeart();
  await userEvent.press(screen.getByRole('button', { name: 'Save tour' }));
  expect(router.push).toHaveBeenCalledWith('/auth/sign-in?reason=wishlist');
});

test('signed-in tap toggles; saved state flips the label', async () => {
  const toggle = jest.fn();
  mockUseWishlist.mockReturnValue({ isGuest: false, isSaved: () => true, toggle });
  renderHeart();
  const btn = screen.getByRole('button', { name: 'Remove from saved' });
  expect(btn.props.accessibilityState).toMatchObject({ selected: true });
  await userEvent.press(btn);
  expect(toggle).toHaveBeenCalledWith('uuid-1');
});
```

(Home/Explore specs: `HeartButton` renders inside them now — their `jest.mock('../lib/tours')` etc. stay, but the button calls `useWishlist` → mock it there too by adding the same `jest.mock('../lib/wishlist', …)` with `{ isGuest: true, isSaved: () => false, toggle: jest.fn() }`. Add that mock block to `home.spec.tsx`, `explore.spec.tsx`, and `tour-detail-screen.spec.tsx`.)

- [ ] **Step 7: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add apps/mobile/src/lib/wishlist.ts apps/mobile/src/lib/wishlist.spec.ts apps/mobile/src/components/heart-button.tsx apps/mobile/src/components/tour-card.tsx apps/mobile/src/lib/tours.ts apps/mobile/src/lib/tours.spec.ts "apps/mobile/src/app/(tabs)/index.tsx" "apps/mobile/src/app/(tabs)/explore.tsx" "apps/mobile/src/app/tours/[slug]/index.tsx" apps/mobile/src/__tests__/heart-button.spec.tsx apps/mobile/src/__tests__/home.spec.tsx apps/mobile/src/__tests__/explore.spec.tsx apps/mobile/src/__tests__/tour-detail-screen.spec.tsx apps/mobile/src/lib/explore-state.spec.ts apps/mobile/src/__tests__/tour-card.spec.tsx
git commit -m "feat(mobile): wishlist hearts - useWishlist optimistic toggle + HeartButton on cards/detail"
```

---

### Task 7: `AuthGate` + Saved tab

**Files:**
- Create: `apps/mobile/src/components/auth-gate.tsx`
- Modify: `apps/mobile/src/app/(tabs)/saved.tsx` (real screen)
- Test: `apps/mobile/src/__tests__/saved.spec.tsx`

**Interfaces:**
- Consumes: `useAuth` (T4), `fetchSavedTours`/`useWishlist` (T6), `messages.mobile.authPrompts/saved` (T3), `Skeleton`/`Button`.
- Produces: `AuthGate({ icon, title, body })` (also used by Account, T8).

- [ ] **Step 1: AuthGate**

`apps/mobile/src/components/auth-gate.tsx`:

```tsx
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Button, useTheme } from '@tourism/mobile-ui';

const t = messages.mobile.authPrompts;

/** Centred signed-out gate used by the Saved and Account tabs. */
export function AuthGate({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
    >
      <Ionicons name={icon} size={48} color={theme.colors['muted-foreground']} />
      <AppText variant="title">{title}</AppText>
      <AppText variant="body" muted style={{ textAlign: 'center' }}>
        {body}
      </AppText>
      <Button label={t.signIn} onPress={() => router.push('/auth/sign-in')} />
      <Button
        label={t.createAccount}
        variant="outline"
        onPress={() => router.push('/auth/sign-up')}
      />
    </View>
  );
}
```

- [ ] **Step 2: Saved tab**

Replace `apps/mobile/src/app/(tabs)/saved.tsx`:

```tsx
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { SectionHeading } from '../../components/section-heading';
import { useAuth } from '../../lib/auth-context';
import { fetchSavedTours, useWishlist, type SavedTourVm } from '../../lib/wishlist';

const t = messages.mobile.saved;
const tp = messages.mobile.authPrompts;
const tf = messages.featuredTours;

function SavedRow({ tour, onRemove }: { tour: SavedTourVm; onRemove: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={() => router.push(`/tours/${tour.slug}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Image
        source={tour.image ? { uri: tour.image } : undefined}
        style={{
          width: 96,
          height: 72,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors['muted'],
        }}
        contentFit="cover"
        accessibilityLabel={tour.title}
      />
      <View style={{ flex: 1, gap: theme.spacing(1) }}>
        <AppText
          numberOfLines={2}
          style={{
            fontFamily: theme.fontFamilies.sansSemiBold,
            fontSize: 15,
            lineHeight: 20,
            minHeight: 40,
            color: theme.colors['foreground'],
          }}
        >
          {tour.title}
        </AppText>
        <AppText variant="caption" muted>
          {tf.from} {tour.currency === 'USD' ? '$' : `${tour.currency} `}
          {tour.basePrice.toLocaleString('en-US')}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.removeLabel}
        hitSlop={8}
        onPress={onRemove}
        style={({ pressed }) => ({ padding: theme.spacing(2), opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="heart-dislike-outline" size={20} color={theme.colors['destructive']} />
      </Pressable>
    </Pressable>
  );
}

export default function SavedScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const { toggle } = useWishlist();
  const listQ = useQuery({
    queryKey: ['wishlist', 'list'],
    queryFn: fetchSavedTours,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate icon="heart-outline" title={tp.savedGateTitle} body={tp.savedGateBody} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={listQ.data ?? []}
        keyExtractor={(item) => item.tourId}
        renderItem={({ item }) => <SavedRow tour={item} onRemove={() => toggle(item.tourId)} />}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing(4) }} />}
        ListHeaderComponent={
          <View style={{ paddingVertical: theme.spacing(4) }}>
            <SectionHeading title={t.title} />
          </View>
        }
        ListFooterComponent={<View style={{ height: theme.spacing(6) }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={listQ.isRefetching}
            onRefresh={() => listQ.refetch()}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
        ListEmptyComponent={
          listQ.isPending ? (
            <View style={{ gap: theme.spacing(3) }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={72} borderRadius={theme.radius.md} />
              ))}
            </View>
          ) : listQ.isError ? (
            <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
              <AppText variant="body" style={{ textAlign: 'center' }}>
                {t.error}
              </AppText>
              <Button label={t.retry} onPress={() => listQ.refetch()} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {t.empty}
              </AppText>
              <Button label={t.browse} variant="outline" onPress={() => router.push('/explore')} />
            </View>
          )
        }
      />
    </Screen>
  );
}
```

- [ ] **Step 3: Saved tests**

`apps/mobile/src/__tests__/saved.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import SavedScreen from '../app/(tabs)/saved';
import { fetchSavedTours } from '../lib/wishlist';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

let mockStatus = 'signedOut';
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ status: mockStatus, user: null }),
}));

const mockToggle = jest.fn();
jest.mock('../lib/wishlist', () => ({
  ...jest.requireActual('../lib/wishlist'),
  fetchSavedTours: jest.fn(),
  useWishlist: () => ({ isGuest: mockStatus !== 'signedIn', isSaved: () => true, toggle: mockToggle }),
}));

const mockFetch = fetchSavedTours as jest.MockedFunction<typeof fetchSavedTours>;

function renderSaved() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <SavedScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
});

test('guests see the sign-in gate', () => {
  renderSaved();
  expect(screen.getByText('Save tours you love')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
});

test('signed-in users see their saved tours and can remove one', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce([
    {
      tourId: 'uuid-1',
      slug: 'ha-long-cruise',
      title: 'Ha Long Bay Cruise',
      image: 'https://img.test/h.jpg',
      basePrice: 450,
      currency: 'USD',
    },
  ]);
  renderSaved();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Remove from saved' }));
  expect(mockToggle).toHaveBeenCalledWith('uuid-1');
});

test('signed-in empty state offers browsing', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce([]);
  renderSaved();
  expect(await screen.findByText(/nothing saved yet/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Browse tours' })).toBeOnTheScreen();
});
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add apps/mobile/src/components/auth-gate.tsx "apps/mobile/src/app/(tabs)/saved.tsx" apps/mobile/src/__tests__/saved.spec.tsx
git commit -m "feat(mobile): Saved tab - auth gate, saved list with optimistic remove"
```

---

### Task 8: Profile lib + Account tab

**Files:**
- Create: `apps/mobile/src/lib/profile.ts` + `profile.spec.ts`
- Modify: `apps/mobile/src/app/(tabs)/account.tsx` (real screen)
- Modify: `libs/shared/i18n/src/lib/messages.ts` (delete `mobile.placeholders` — last user gone)
- Test: `apps/mobile/src/__tests__/account.spec.tsx`

**Interfaces:**
- Consumes: `useAuth`/`AuthGate`/`WEB_URL`, `messages.mobile.account` (T3).
- Produces: `ProfileVm { fullName, email, initial }` · `toProfileVm(dto)` · `fetchProfile()` · `updateProfile(fullName): Promise<ProfileVm>`.

- [ ] **Step 1: Failing profile spec**

`apps/mobile/src/lib/profile.spec.ts`:

```ts
import type { components } from '@tourism/core';
import { toProfileVm } from './profile';

type UserDto = components['schemas']['UserDto'];

test('maps name, email and initial', () => {
  const vm = toProfileVm({ email: 'jane@example.com', fullName: 'Jane Doe' } as UserDto);
  expect(vm).toEqual({ fullName: 'Jane Doe', email: 'jane@example.com', initial: 'J' });
});

test('falls back to the email initial when the name is null', () => {
  const vm = toProfileVm({ email: 'zed@example.com', fullName: null } as UserDto);
  expect(vm).toEqual({ fullName: '', email: 'zed@example.com', initial: 'Z' });
});
```

Run: `pnpm nx test @tourism/mobile --testPathPatterns=profile` → FAIL.

- [ ] **Step 2: Implement**

`apps/mobile/src/lib/profile.ts`:

```ts
import type { components } from '@tourism/core';
import { getApiClient } from './api';

type UserDto = components['schemas']['UserDto'];

export interface ProfileVm {
  fullName: string;
  email: string;
  initial: string;
}

export function toProfileVm(dto: UserDto): ProfileVm {
  const fullName = dto.fullName ?? '';
  const source = fullName || dto.email;
  return { fullName, email: dto.email, initial: (source[0] ?? '?').toUpperCase() };
}

export async function fetchProfile(): Promise<ProfileVm> {
  const { data } = await getApiClient().GET('/api/v1/users/me');
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty profile response');
  return toProfileVm(dto);
}

export async function updateProfile(fullName: string): Promise<ProfileVm> {
  const { data } = await getApiClient().PATCH('/api/v1/users/me', {
    body: { fullName },
  });
  const dto = (data as unknown as { data?: UserDto } | undefined)?.data;
  if (!dto) throw new Error('empty profile response');
  return toProfileVm(dto);
}
```

- [ ] **Step 3: Account screen**

Replace `apps/mobile/src/app/(tabs)/account.tsx`:

```tsx
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Skeleton, TextField, useTheme } from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { SectionHeading } from '../../components/section-heading';
import { useAuth } from '../../lib/auth-context';
import { WEB_URL } from '../../lib/env';
import { fetchProfile, updateProfile, type ProfileVm } from '../../lib/profile';

const t = messages.mobile.account;
const tp = messages.mobile.authPrompts;

function MenuRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const color = destructive ? theme.colors['destructive'] : theme.colors['foreground'];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(3),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
      <AppText variant="body" style={{ flex: 1, color }}>
        {label}
      </AppText>
      {!destructive ? (
        <Ionicons name="chevron-forward" size={16} color={theme.colors['muted-foreground']} />
      ) : null}
    </Pressable>
  );
}

function Profile({ profile }: { profile: ProfileVm }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [name, setName] = useState(profile.fullName);
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);

  const saveM = useMutation({
    mutationFn: updateProfile,
    onSuccess: (vm) => {
      queryClient.setQueryData(['profile'], vm);
      setFeedback('saved');
    },
    onError: () => setFeedback('error'),
  });

  return (
    <View style={{ gap: theme.spacing(5), paddingVertical: theme.spacing(4) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors['secondary'],
          }}
        >
          <AppText variant="title" style={{ color: theme.colors['primary'] }}>
            {profile.initial}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title" numberOfLines={1}>
            {profile.fullName || profile.email}
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {profile.email}
          </AppText>
        </View>
      </View>

      <View style={{ gap: theme.spacing(2) }}>
        <TextField label={t.editNameLabel} value={name} onChangeText={setName} />
        <Button
          label={saveM.isPending ? t.editNameSaving : t.editNameSave}
          loading={saveM.isPending}
          onPress={() => {
            setFeedback(null);
            saveM.mutate(name.trim());
          }}
          disabled={name.trim() === '' || name.trim() === profile.fullName}
        />
        {feedback === 'saved' ? (
          <AppText variant="caption" style={{ color: theme.colors['success'] }}>
            {t.editNameSaved}
          </AppText>
        ) : feedback === 'error' ? (
          <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
            {t.editNameError}
          </AppText>
        ) : null}
      </View>

      <View>
        <MenuRow icon="heart-outline" label={t.menuSaved} onPress={() => router.push('/saved')} />
        <MenuRow
          icon="shield-checkmark-outline"
          label={t.menuPrivacy}
          onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
        />
        <MenuRow
          icon="document-text-outline"
          label={t.menuTerms}
          onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
        />
        <MenuRow icon="log-out-outline" label={t.signOut} destructive onPress={() => signOut()} />
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate
          icon="person-circle-outline"
          title={tp.accountGateTitle}
          body={tp.accountGateBody}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingTop: theme.spacing(4) }}>
        <SectionHeading title={messages.account.title} />
      </View>
      {profileQ.isPending ? (
        <View style={{ gap: theme.spacing(3) }}>
          <Skeleton height={56} borderRadius={28} width={56} />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </View>
      ) : profileQ.isError || !profileQ.data ? (
        <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.loadError}
          </AppText>
          <Button label={t.retry} onPress={() => profileQ.refetch()} />
        </View>
      ) : (
        <Profile profile={profileQ.data} />
      )}
    </Screen>
  );
}
```

(imports gain `import { router } from 'expo-router';` — used by the Saved menu row.)

- [ ] **Step 4: Remove `mobile.placeholders` from i18n**

Delete the `placeholders: { saved: …, account: … }` block in `messages.ts` (both consumers replaced this wave).

- [ ] **Step 5: Account tests**

`apps/mobile/src/__tests__/account.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import AccountScreen from '../app/(tabs)/account';
import { fetchProfile, updateProfile } from '../lib/profile';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

let mockStatus = 'signedOut';
const mockSignOut = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ status: mockStatus, user: null, signOut: mockSignOut }),
}));

jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

const mockFetch = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const mockUpdate = updateProfile as jest.MockedFunction<typeof updateProfile>;

function renderAccount() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <AccountScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
});

test('guests see the account gate', () => {
  renderAccount();
  expect(screen.getByText('Your account')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
});

test('signed-in users see the profile and can save a new name', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    initial: 'J',
  });
  mockUpdate.mockResolvedValueOnce({
    fullName: 'Jane N. Doe',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderAccount();
  expect(await screen.findByText('jane@example.com')).toBeOnTheScreen();
  const input = screen.getByLabelText('Display name');
  await userEvent.clear(input);
  await userEvent.type(input, 'Jane N. Doe');
  await userEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Name updated.')).toBeOnTheScreen();
  expect(mockUpdate).toHaveBeenCalledWith('Jane N. Doe');
});

test('sign out fires from the menu', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({ fullName: 'Jane', email: 'jane@example.com', initial: 'J' });
  renderAccount();
  await screen.findByText('jane@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(mockSignOut).toHaveBeenCalled();
});
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile @tourism/i18n` → green.

```bash
git add apps/mobile/src/lib/profile.ts apps/mobile/src/lib/profile.spec.ts "apps/mobile/src/app/(tabs)/account.tsx" apps/mobile/src/__tests__/account.spec.tsx libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(mobile): Account tab - profile, edit name, web legal links, sign out"
```

---

### Task 9: Gate, on-device verification, STATUS

- [ ] **Step 1: Full gate**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile mobile-ui @tourism/i18n` → green.
Run: `pnpm nx affected -t lint typecheck test --base=main` → green (regenerate the Prisma client first if api suites fail on `.prisma/client`: `cd apps/api; npx prisma generate`).

- [ ] **Step 2: On-device (Expo Go — restart with `--clear`, new deps)**

1. Guest flows: Saved/Account tabs show gates · heart on a card routes to sign-in with the wishlist line.
2. Register a real account (check both branches: if "check your inbox" appears, confirm via email then sign in). After sign-in: row exists in Supabase auth + `users` table (`/auth/sync`).
3. Heart tours from Home/Explore/detail → instant fill (optimistic) → rows in Saved tab → also visible in the web app's account/saved (same DB).
4. Remove from Saved (row disappears immediately).
5. Account: profile renders · edit display name → persists (check web settings too) · Privacy/Terms open the deployed web · Sign out returns tabs to gates.
6. Light + dark pass over the new screens; keyboard behavior in the auth forms.

- [ ] **Step 3: STATUS + handoff**

Append `## STATUS` (tasks + hashes + on-device result). User review → rebase + `--ff-only` merge (user confirms) → docs sweep (roadmap P5 row → W3 done/W4 next, CLAUDE.md mobile row, HANDOFF, memory, test baselines).

---

## STATUS

_(filled in during execution)_
