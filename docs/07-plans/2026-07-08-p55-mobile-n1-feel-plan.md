# P5.5 N1 — "Feel" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task (this repo executes **inline — no
> subagents**). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing screens *feel* like an app — ripple, haptics,
motion, native stack headers, image fade-in, autofill-friendly forms —
without changing any screen's layout, the data layer, or the API.

**Architecture:** Additive polish over the P5 codebase. New deps
(`react-native-reanimated`, `react-native-gesture-handler` for N2,
`expo-haptics`) land first WITH their jest wiring so every later task runs
on a green suite. Headers flip from hand-rolled to styled native Stack
headers. All animation is systemic (entering/layout transitions), no
choreography.

**Tech Stack:** Expo SDK 54 · expo-router Stack headers ·
react-native-reanimated 4 (babel plugin auto-wired by `babel-preset-expo`) ·
expo-haptics · `Pressable android_ripple`.

**Spec:** `docs/06-specs/2026-07-08-p55-mobile-native-ux-design.md` (Wave N1)

## STATUS

- **State:** NOT STARTED
- **Branch:** `feat/mobile-n1-feel` (spec committed)
- **Baselines:** mobile **126** · mobile-ui **33** (api 338 · web 191 · admin 152)
- **RESUME STATE:** start at Task 1
- **Reminder:** the W4 on-device payment pass is still owed — schedule it
  with this wave's device pass (same checklist, see Task 9).

## Global Constraints

- **Execute inline — no subagents; no worktrees** (standing rules).
- **Zero layout/structure changes** — N1 never moves an element; it only
  changes chrome, feedback, and transitions. If a task seems to require
  moving things, stop and re-check the spec.
- **No hex colors** — ripple/placeholder colors come from `theme.colors`.
- **Custom fonts on Android ignore `fontWeight`** — header titles switch
  `fontFamily`, never weight.
- Specs live outside `src/app/`; spec QueryClients need `gcTime: 0` for
  queries AND mutations; `jest.mock` factory vars must be `mock*`-prefixed;
  `jest.clearAllMocks()` keeps replaced implementations (re-set defaults in
  `beforeEach`); Jest 30 flag is `--testPathPatterns`.
- Straight quotes · Conventional Commits · commit after every task.
- Run tests per project: `pnpm nx test mobile` / `pnpm nx test mobile-ui`.

---

### Task 1: Deps + jest wiring (land green before any usage)

**Files:**
- Modify: `apps/mobile/package.json` (via `expo install`)
- Modify: `apps/mobile/src/test-setup.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `react-native-reanimated` (Task 5), `expo-haptics` (Task 4),
  `react-native-gesture-handler` (N2 dep, wired now per spec risk note).

- [ ] **Step 1: Install SDK-pinned versions** (from `apps/mobile` so Expo
  resolves the SDK 54 compatible versions):

```bash
cd apps/mobile
pnpm exec expo install react-native-reanimated react-native-gesture-handler expo-haptics
cd ../..
```

Verify `apps/mobile/package.json` gained all three. `babel-preset-expo`
auto-configures the reanimated/worklets babel plugin when the package is
present — no babel config change expected (verify in Step 3).

- [ ] **Step 2: Wire jest** — append to `apps/mobile/src/test-setup.ts`:

```ts
// Reanimated + gesture-handler have native parts jest can't load — use the
// libraries' official mocks (entering/exiting props become no-ops).
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
require('react-native-gesture-handler/jestSetup');

// Haptics are fire-and-forget native calls — a global no-op mock keeps every
// spec deterministic; specs that assert on haptics re-mock locally.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
```

- [ ] **Step 3: Verify green + bundle**

Run: `pnpm nx run-many -t test -p mobile mobile-ui`
Expected: 126 + 33 pass, no transform errors. If jest fails to parse either
new package, add it to the `transformIgnorePatterns` allowlist in
`apps/mobile/jest.config.cts` (same list as `react-native-url-polyfill`).
Then: `pnpm nx build mobile` (expo export) — expected: bundles clean, which
also proves the babel plugin wired itself.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/src/test-setup.ts
git commit -m "chore(mobile): add reanimated + gesture-handler + haptics with jest wiring (P5.5 N1)"
```

---

### Task 2: Native stack headers (styled Fraunces)

Screens gain real navigation headers (back gesture affordance, scroll
behavior, safe-area for free); the three hand-rolled header rows go away.
Detail/gallery keep their overlay; result keeps no header (full-bleed
status moment); modals unchanged.

**Files:**
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/app/tours/[slug]/book.tsx`
- Modify: `apps/mobile/src/app/bookings/index.tsx`
- Modify: `apps/mobile/src/app/bookings/[code]/index.tsx`
- Tests: existing specs must stay green (they assert content, not chrome).

**Interfaces:**
- Consumes: `messages.booking.page.title` · `messages.booking.list.title` ·
  `messages.booking.detail.title` (existing copy — titles move from JSX into
  route options).

- [ ] **Step 1: Header styling defaults + per-screen titles** in
  `_layout.tsx` — extend the `<Stack screenOptions>` and the three screens:

```tsx
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
          contentStyle: { backgroundColor: theme.colors['background'] },
          // Brand-styled native header for the screens that opt in below.
          headerStyle: { backgroundColor: theme.colors['background'] },
          headerTintColor: theme.colors['foreground'],
          headerTitleStyle: { fontFamily: theme.fontFamilies.heading, fontSize: 18 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
```

and:

```tsx
        <Stack.Screen
          name="tours/[slug]/book"
          options={{ headerShown: true, title: messages.booking.page.title }}
        />
        <Stack.Screen
          name="bookings/index"
          options={{ headerShown: true, title: messages.booking.list.title }}
        />
        <Stack.Screen
          name="bookings/[code]/index"
          options={{ headerShown: true, title: messages.booking.detail.title }}
        />
```

(`import { messages } from '@tourism/i18n';` at the top of `_layout.tsx`.)

- [ ] **Step 2: Strip the hand-rolled header in `book.tsx`** — delete the
  `{/* Header */}` block (back Pressable + `t.page.title` AppText) and the
  now-unneeded `insets.top` padding:

```tsx
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(4),
          paddingBottom: theme.spacing(6),
          gap: theme.spacing(5),
        }}
```

Add the subtitle where the title used to anchor context (native headers
have no subtitle): first child of the ScrollView:

```tsx
        <AppText variant="caption" muted>
          {t.page.subtitle}
        </AppText>
```

- [ ] **Step 3: Strip `Header` in `bookings/index.tsx`** — delete the local
  `Header` component and its usage; render the subtitle as a caption above
  the list states instead:

```tsx
      <View style={{ flex: 1, paddingTop: theme.spacing(2), gap: theme.spacing(3) }}>
        <AppText variant="caption" muted>
          {t.subtitle}
        </AppText>
        {listQ.isPending ? (
```

Remove the now-unused `Pressable`/`Ionicons` imports if nothing else uses
them in the file.

- [ ] **Step 4: Strip the header row in `bookings/[code]/index.tsx`** —
  delete the back-arrow + title row; the status Badge moves to its own row
  above the facts card:

```tsx
      <View style={{ gap: theme.spacing(5), paddingVertical: theme.spacing(4) }}>
        <Badge
          tone={booking.statusMeta.tone}
          label={booking.statusMeta.label}
          style={{ alignSelf: 'flex-start' }}
        />
        {/* facts card unchanged below */}
```

Remove unused imports (`Pressable` stays — the tour-link row uses it;
`Ionicons` goes if unused).

- [ ] **Step 5: Verify**

Run: `pnpm nx run-many -t lint typecheck test -p mobile`
Expected: green — the affected specs (`book-screen`, `bookings-list`,
`booking-detail`) assert content and testIDs, not the removed chrome. If a
query breaks, fix ONLY that query.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app
git commit -m "feat(mobile): native stack headers styled with Fraunces; drop hand-rolled headers"
```

---

### Task 3: Ripple on every pressable surface

Android pressed feedback = ripple; the `opacity` trick remains for iOS.
Canonical pattern (apply everywhere below):

```tsx
<Pressable
  android_ripple={{ color: theme.colors['muted'], foreground: true }}
  style={({ pressed }) => ({
    // keep existing styles; gate the opacity fallback to iOS:
    opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
  })}
>
```

Note: `android_ripple` needs the Pressable itself to clip — surfaces with
`borderRadius` also need `overflow: 'hidden'` on the same style object or
the ripple bleeds square. Add it wherever a radius exists.

**Files (each gets the two props; the opacity gate replaces the existing
`pressed ?` expression):**
- Modify: `libs/mobile/ui/src/lib/button.tsx` (ripple color:
  `theme.colors['primary-foreground']` for the primary variant — muted is
  invisible on the emerald fill — and `muted` for outline)
- Modify: `libs/mobile/ui/src/lib/chip.tsx`
- Modify: `libs/mobile/ui/src/lib/accordion.tsx` (trigger keeps its
  `muted` pressed background on iOS only; Android uses ripple)
- Modify app components: `apps/mobile/src/app/(tabs)/account.tsx` (MenuRow),
  `apps/mobile/src/components/tour-card.tsx`,
  `apps/mobile/src/components/destination-card.tsx`,
  `apps/mobile/src/components/heart-button.tsx`,
  `apps/mobile/src/app/bookings/index.tsx` (BookingCard),
  `apps/mobile/src/app/tours/[slug]/book.tsx` (departure + provider cards,
  steppers), `apps/mobile/src/app/(tabs)/saved.tsx` (row + remove),
  `apps/mobile/src/app/tours/[slug]/index.tsx` (BackOverlay)
- Test: `libs/mobile/ui/src/lib/button.spec.tsx` (+1 case)

**Interfaces:** none new — visual/props only.

- [ ] **Step 1: Failing test** — append to `button.spec.tsx`:

```tsx
test('Android pressed feedback is a ripple', () => {
  render(
    <ThemeProvider>
      <Button label="Book now" testID="btn" />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('btn').props.android_ripple).toBeTruthy();
});
```

(Add `testID` pass-through if Button doesn't already spread it — it spreads
`...rest`, so it does.)

- [ ] **Step 2: Run to verify it fails** —
  `pnpm nx test mobile-ui --testPathPatterns button`
  Expected: FAIL — `android_ripple` undefined.

- [ ] **Step 3: Apply the canonical pattern** to `button.tsx`, then sweep
  the remaining files in the list above. Keep each diff minimal: two props,
  no reformatting.

- [ ] **Step 4: Verify** — `pnpm nx run-many -t lint typecheck test -p mobile mobile-ui`
  Expected: green (34 mobile-ui).

- [ ] **Step 5: Commit**

```bash
git add libs/mobile/ui/src/lib apps/mobile/src
git commit -m "feat(mobile): Android ripple feedback across all pressable surfaces"
```

---

### Task 4: Haptics at meaningful moments

**Files:**
- Create: `apps/mobile/src/lib/haptics.ts`
- Modify: `apps/mobile/src/components/heart-button.tsx` (toggle → select)
- Modify: `apps/mobile/src/app/bookings/[code]/result.tsx` (PAID → success)
- Modify: `apps/mobile/src/app/bookings/[code]/index.tsx` (cancel confirm →
  warning) · `apps/mobile/src/app/(tabs)/saved.tsx` (remove → select)
- Test: `apps/mobile/src/__tests__/booking-result.spec.tsx` (+1 assertion)

**Interfaces:**
- Produces: `hapticSelect()` · `hapticSuccess()` · `hapticWarning()` —
  fire-and-forget, never awaited by callers.

- [ ] **Step 1: The wrapper** — `apps/mobile/src/lib/haptics.ts`:

```ts
import * as Haptics from 'expo-haptics';

/**
 * Fire-and-forget haptics for meaningful moments only (selection toggles,
 * booking success, destructive confirms) — never plain navigation. Failures
 * are swallowed: haptics must never break a flow.
 */
export function hapticSelect(): void {
  Haptics.selectionAsync().catch(() => undefined);
}

export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticWarning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
```

- [ ] **Step 2: Failing assertion** — in `booking-result.spec.tsx`, extend
  the first PAID test:

```tsx
import * as Haptics from 'expo-haptics';
// ... inside 'opens the browser then confirms a PAID booking':
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
```

Run: `pnpm nx test mobile --testPathPatterns booking-result` → FAIL.

- [ ] **Step 3: Wire the four call sites**
  - `heart-button.tsx`: `hapticSelect();` first line of the signed-in
    `onPress` branch (before `toggle(tourId)`).
  - `result.tsx`: `hapticSuccess();` inside `verify()` right where
    `setPhase('paid')` fires.
  - booking detail `confirmCancel`: `hapticWarning();` before `Alert.alert`.
  - `saved.tsx` remove handler: `hapticSelect();` before the mutation.

- [ ] **Step 4: Verify** — `pnpm nx test mobile --testPathPatterns "booking-result|heart-button|saved|booking-detail"`
  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src
git commit -m "feat(mobile): haptics on heart toggle, booking success and destructive confirm"
```

---

### Task 5: Motion (reanimated entering/layout transitions)

All systemic, all subtle (≤250ms). With the Task 1 mock, animations are
no-ops under jest — specs stay green.

**Files:**
- Modify: `libs/mobile/ui/src/lib/accordion.tsx`
- Modify: `apps/mobile/src/app/bookings/[code]/result.tsx` (checkmark)
- Modify screens with skeleton→content swaps:
  `apps/mobile/src/app/bookings/index.tsx` · `apps/mobile/src/app/(tabs)/saved.tsx`
  · `apps/mobile/src/app/(tabs)/account.tsx` · `apps/mobile/src/app/(tabs)/index.tsx`
  (home featured shelf) · `apps/mobile/src/app/(tabs)/explore.tsx` (list)

**Interfaces:** none new.

- [ ] **Step 1: Accordion animates open/close** — body wraps in an animated
  view; the container gets a layout transition:

```tsx
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
// container View → <Animated.View layout={LinearTransition.duration(200)} style={...}>
// body:
      {open ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={{ paddingHorizontal: theme.spacing(3), paddingBottom: theme.spacing(3) }}
        >
          {children}
        </Animated.View>
      ) : null}
```

- [ ] **Step 2: Success checkmark** — in `result.tsx`'s paid block:

```tsx
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
// icon:
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <Ionicons name="checkmark-circle" size={56} color={theme.colors['success']} />
              </Animated.View>
```

- [ ] **Step 3: Skeleton→content crossfade** — canonical pattern: wrap the
  loaded-content root (the branch that replaces the skeleton) in
  `<Animated.View entering={FadeIn.duration(200)}>…</Animated.View>` on the
  five screens listed. One wrapper per screen, nothing else moves.

- [ ] **Step 4: Verify** — `pnpm nx run-many -t lint typecheck test -p mobile mobile-ui`
  then `pnpm nx build mobile` (expo export — proves reanimated bundles).

- [ ] **Step 5: Commit**

```bash
git add libs/mobile/ui/src/lib/accordion.tsx apps/mobile/src
git commit -m "feat(mobile): reanimated transitions - accordion, skeleton crossfade, success zoom"
```

---

### Task 6: Image fade-in (no more white pop)

Canonical pattern for every `expo-image` `<Image>` showing remote content:
container/style gains `backgroundColor: theme.colors['muted']` (tinted
placeholder) and the Image gains `transition={200}`.

**Files:**
- Modify: `apps/mobile/src/components/gallery-pager.tsx` ·
  `apps/mobile/src/components/tour-card.tsx` ·
  `apps/mobile/src/components/destination-card.tsx` ·
  `apps/mobile/src/app/(tabs)/index.tsx` (hero image — still present until
  N3) · `apps/mobile/src/app/(tabs)/saved.tsx` (thumb) ·
  `apps/mobile/src/app/tours/[slug]/book.tsx` (summary thumb)

**Interfaces:** none new.

- [ ] **Step 1: Apply the pattern** to each file (two style/prop additions
  per image, no layout change).
- [ ] **Step 2: Verify** — `pnpm nx test mobile` green (expo-image is
  mocked to a View in tests — props are inert).
- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src
git commit -m "feat(mobile): tinted placeholders + fade-in transition on all remote images"
```

---

### Task 7: Card shadow → boxShadow

**Files:**
- Modify: `libs/mobile/ui/src/lib/card.tsx`
- Test: `libs/mobile/ui/src/lib/card.spec.tsx` (update the shadow assertion
  if it asserts legacy props)

- [ ] **Step 1: Replace the legacy block** in `card.tsx`:

```tsx
        {
          backgroundColor: theme.colors['card'],
          borderRadius: theme.radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: theme.colors['border'],
          overflow: 'hidden',
          // RN 0.81 CSS shadow (replaces legacy shadow* + elevation).
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
```

The rgba here is a *shadow alpha*, not a palette color — the no-hex rule
targets palette drift; shadows follow the web tokens' shadow style. If lint
flags it, move the literal into `theme` as a shared constant instead of
suppressing.

- [ ] **Step 2: Verify** — `pnpm nx test mobile-ui` (fix the card spec's
  shadow assertion to `boxShadow` if present).
- [ ] **Step 3: Commit**

```bash
git add libs/mobile/ui/src/lib
git commit -m "feat(mobile-ui): Card uses CSS boxShadow (drops legacy shadow/elevation)"
```

---

### Task 8: Forms, keyboard & autofill

**Files:**
- Modify: `apps/mobile/src/app/auth/sign-in.tsx` · `sign-up.tsx` · `forgot.tsx`
- Modify: `apps/mobile/src/app/tours/[slug]/book.tsx` (contact fields +
  keyboard avoidance)
- Modify: `apps/mobile/src/app/tours/[slug]/enquiry.tsx` (autoComplete)
- Modify: `apps/mobile/src/components/fact-row.tsx` (`selectable` opt-in)
- Modify: `apps/mobile/src/app/bookings/[code]/index.tsx` (code + payment
  facts become selectable)

**Interfaces:**
- Produces: `FactRow` gains optional `selectable?: boolean` (value Text).

- [ ] **Step 1: Autofill hints** — canonical per-field additions:
  - email fields: `autoComplete="email" textContentType="emailAddress"`
  - passwords: sign-in `autoComplete="current-password" textContentType="password"`;
    sign-up `autoComplete="new-password" textContentType="newPassword"`
  - names: `autoComplete="name" textContentType="name"`
  - phone: `autoComplete="tel" textContentType="telephoneNumber"`

- [ ] **Step 2: Return-key chaining** on sign-in/sign-up (email →
  `returnKeyType="next"` + `onSubmitEditing` focuses the password ref via
  `useRef<TextInput>`; password → `returnKeyType="done"` +
  `onSubmitEditing={onSubmit}`). `TextField` spreads `TextInputProps` and
  needs a `ref` pass-through — add `React.forwardRef` to
  `libs/mobile/ui/src/lib/text-field.tsx` forwarding to the inner
  `TextInput` (keep props unchanged).

- [ ] **Step 3: Keyboard avoidance on the booking form** — wrap `book.tsx`'s
  root View:

```tsx
import { KeyboardAvoidingView } from 'react-native';
// root:
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors['background'] }}
    >
      {/* existing ScrollView + sticky footer unchanged */}
    </KeyboardAvoidingView>
```

(Android already resizes via `adjustResize`; iOS needs the padding
behavior.)

- [ ] **Step 4: Selectable facts** — `fact-row.tsx`:

```tsx
export function FactRow({ label, value, selectable }: { label: string; value: string; selectable?: boolean }) {
  // value AppText gains: selectable={selectable}
```

(`AppText` spreads Text props.) In booking detail, pass `selectable` on the
reference-code and payment FactRows.

- [ ] **Step 5: Verify** — `pnpm nx run-many -t lint typecheck test -p mobile mobile-ui`
  Expected: green (auth-screens spec unaffected — props are inert in RNTL).
- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src libs/mobile/ui/src/lib/text-field.tsx
git commit -m "feat(mobile): autofill hints, return-key chaining, keyboard avoidance, selectable facts"
```

---

### Task 9: Gate + STATUS + device pass hand-off

- [ ] **Step 1: Full gate** — `pnpm nx run-many -t lint typecheck test build`
  Expected: all green (record new test counts; ~mobile 127 · mobile-ui 34).
- [ ] **Step 2: Update this plan's STATUS** (state, counts, deviations) and
  commit `docs(plan): N1 STATUS - executed, gate green`.
- [ ] **Step 3: Hand off to the user for the on-device pass** (Expo Go,
  `pnpm exec expo start --clear` from `apps/mobile`):
  - N1 checks: ripple on every tap · haptic on heart/success/cancel ·
    headers (back gesture + Fraunces titles) · accordion animates · images
    fade in · keyboard doesn't cover the booking footer · Android autofill
    offers email/name.
  - **Plus the owed W4 payment pass** (Stripe test card · PayPal sandbox ·
    abandon → Pay now · cancel/cancellation-request · guest gating).
  - Merge only after user approval (rebase + `--ff-only`), then the docs
    sweep.
