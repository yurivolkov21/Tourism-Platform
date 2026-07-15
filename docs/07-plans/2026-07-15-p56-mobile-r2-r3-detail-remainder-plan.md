# P5.6 R2+R3 — "Detail + Money-path skin" & "Remainder" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans
> (inline, per repo precedent). Combined R2+R3 per the user's 2026-07-15
> decision: ship the whole redesign in one pass, single end review against
> the Navel reference. Checkbox steps for tracking.

**Goal:** Finish "Nexora Dark Heritage" — tour detail, booking sheets,
confirmations (R2) and auth/trips/saved/account/empty-states (R3) — so no
screen carries the old skin.

**Architecture:** Same as R1 — presentation-only over `useTheme()`; two new
primitives (`StickyCTABar`, `GlowBadge`); screens compose them. **Zero
data-layer change** (booking/auth/query logic byte-identical).

**Spec:** `docs/06-specs/2026-07-15-p56-mobile-navel-redesign-design.md`
**Branch:** continue on `feat/mobile-r1-dark-foundation`.

## STATUS

- **State:** PLANNED.
- **Baselines at start:** mobile 153 · mobile-ui 43 (api 541 · web 300 ·
  admin 266 · core 42 · tokens 7).
- **RESUME STATE:** execute tasks in order; per-task commits; adversarial
  review after Task 5; final gate + hand-off at Task 9.

## Global Constraints

Same as R1 (presentation-only · no-hex · straight quotes · Conventional
Commits · mobile-ui native deps = peer+dev · fontFamily not fontWeight ·
`--clear` after token changes · jest `mock*` factory rule · assertion-only
test edits, behavior assertions must pass unchanged). Plus:

- **Money-path rule:** Tasks 3–4 touch booking/result presentation ⇒
  Task 5 adversarial review is NOT skippable.
- i18n: reuse existing keys; new visible copy needs a `@tourism/i18n` key.

---

### Task 1: `StickyCTABar` + `GlowBadge` primitives (TDD)

**Files:** create `libs/mobile/ui/src/lib/sticky-cta-bar.tsx` +
`glow-badge.tsx` + specs; export both from `src/index.ts`.

`StickyCTABar` — pinned footer detached from scroll:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme-provider';

export interface StickyCTABarProps {
  /** Left slot — typically the price block. */
  leading?: ReactNode;
  /** Right slot — the CTA button(s). */
  children: ReactNode;
}

/** P5.6: price + CTA pinned above the bottom edge, detached from scroll.
 * Screens hosting it must pad their scroll content (~96 + insets.bottom). */
export function StickyCTABar({ leading, children }: StickyCTABarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="sticky-cta-bar"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing(3),
        paddingHorizontal: theme.spacing(5),
        paddingTop: theme.spacing(3),
        paddingBottom: insets.bottom + theme.spacing(3),
        backgroundColor: theme.colors['card'],
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
        borderCurve: 'continuous',
        borderTopWidth: 1,
        borderColor: theme.colors['border'],
      }}
    >
      {leading ? <View style={{ flexShrink: 1 }}>{leading}</View> : null}
      <View style={{ flexGrow: 1, flexShrink: 0, maxWidth: '60%' }}>
        {children}
      </View>
    </View>
  );
}
```

`GlowBadge` — circular photo/icon with a semantic glow halo:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from './theme-provider';

export interface GlowBadgeProps {
  /** Halo semantic: success = brass, error = destructive, neutral = muted. */
  tone?: 'success' | 'error' | 'neutral';
  size?: number;
  /** Circular content — an icon or an <Image>. */
  children: ReactNode;
}

/** P5.6 confirmation hero: one template for success/cancel — only the glow
 * color and copy differ (Navel Screen-39/50 pattern). Glow = layered Views
 * (no shadow blur — RN perf). */
export function GlowBadge({
  tone = 'success',
  size = 112,
  children,
}: GlowBadgeProps) {
  const theme = useTheme();
  const glow =
    tone === 'success'
      ? theme.colors['primary']
      : tone === 'error'
        ? theme.colors['destructive']
        : theme.colors['muted-foreground'];
  return (
    <View
      testID={`glow-badge-${tone}`}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      {[1.5, 1.25].map((scale) => (
        <View
          key={scale}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * scale,
            height: size * scale,
            borderRadius: (size * scale) / 2,
            backgroundColor: glow,
            opacity: scale === 1.5 ? 0.08 : 0.16,
          }}
        />
      ))}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: glow,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        {children}
      </View>
    </View>
  );
}
```

Specs: StickyCTABar renders leading + children (getByTestId + getByText);
GlowBadge renders per-tone testID + children. Red → green → commit
`feat(mobile-ui): StickyCTABar + GlowBadge primitives (P5.6 R2)`.

### Task 2: Tour detail — full-bleed hero + thumbnail rail + sticky CTA

**Files:** `apps/mobile/src/app/tours/[slug]/index.tsx` (read fully first),
`apps/mobile/src/components/gallery-pager.tsx` (reuse/adapt),
`apps/mobile/src/app/_layout.tsx` (only if the detail screen needs
`headerShown:false` confirmed — it already is).

- Hero: `ScrimImage` full-width, `aspectRatio` 3/4-ish, `radius={0}`, bleeds
  behind the status bar (screen top padding removed for the hero block);
  floating circular back + heart buttons (`position:absolute`, safe-area
  top inset, `secondary` translucent bg).
- Title block ON the scrim: rating pill + Fraunces `hero`-scale title
  (fontSize ~34 here) + location row (`on-media`).
- Vertical thumbnail rail (right edge of hero): up to 4 gallery images as
  40x40 rounded-square `ScrimImage scrim={false} tint={false}` thumbs +
  existing gallery-pager open behavior; active/pressed ring `primary`.
  If the VM exposes no gallery images beyond the hero, render nothing
  (graceful).
- Body sections keep their data/copy; spacing/radius/token pass only.
- Replace the in-flow price/CTA block with `StickyCTABar` (leading = "from"
  price stack; child = existing Book-now button + its EXACT handler/guard).
  Scroll content gets `paddingBottom: 140`.
- Tests: adjust layout assertions only. Commit
  `feat(mobile): tour detail - full-bleed hero, thumbnail rail, sticky CTA (P5.6 R2)`.

### Task 3: Booking sheets + steps skin

**Files:** `components/departure-sheet.tsx`, `app/tours/[slug]/book.tsx`,
`app/tours/[slug]/book-payment.tsx`, `components/enquiry-sheet.tsx`.

- Token/typography pass: sheet titles adopt Fraunces (`display` 28 —
  sheets don't get `hero` 40), money totals display-treated (large cream
  amount + small muted currency/unit), inputs/chips on `secondary`.
- Primary submit/continue buttons adopt `ready={...}` where a validity
  boolean ALREADY exists in the component (do NOT derive new validation);
  if none exists, leave `ready` off.
- **Handlers, payload builders, draft context, navigation: untouched.**
- Commit `feat(mobile): booking sheets + steps adopt Dark Heritage skin (P5.6 R2)`.

### Task 4: Result/confirmation screens on `GlowBadge`

**Files:** `app/bookings/[code]/result.tsx` (read fully; it self-verifies
payment — logic sacred), possibly `booking detail` header polish.

- The three visual outcomes map to one template: verified-paid →
  `GlowBadge tone="success"` + Fraunces headline; cancelled/failed →
  `tone="error"`; pending/verifying → `tone="neutral"` + existing spinner
  copy. All existing states, retry/deep-link buttons, and AppState
  re-verify flow stay byte-identical.
- Commit `feat(mobile): booking result screens on GlowBadge template (P5.6 R2)`.

### Task 5: Adversarial review (money path — NOT skippable)

Dispatch a STRONG-tier subagent over `git diff main...HEAD` scoped to
Tasks 2–4 files, hunting presentation-regression classes: CTA
reachable/blocked states, sticky bar covering content or double-firing,
guard drift on Book now, result-screen state mapping (PENDING shown as
success?), sheet dismiss racing navigation, a11y labels lost. Fix findings,
re-run mobile suites, commit `fix(mobile): R2 adversarial-review findings`.

### Task 6: Shared `EmptyState` + adoption (R3)

**Files:** create `apps/mobile/src/components/empty-state.tsx`; adopt in
`(tabs)/saved.tsx`, `(tabs)/trips.tsx`, explore empty block.

```tsx
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, useTheme } from '@tourism/mobile-ui';

export function EmptyState({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingVertical: theme.spacing(10),
        paddingHorizontal: theme.spacing(6),
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        <Ionicons name={icon} size={30} color={theme.colors['primary']} />
      </View>
      <AppText
        variant="title"
        style={{ fontFamily: theme.fontFamilies.headingBold, textAlign: 'center' }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}
```

Reuse existing i18n empty strings (title = existing copy; subtitle only
where a string already exists). Commit
`feat(mobile): shared EmptyState + saved/trips/explore adoption (P5.6 R3)`.

### Task 7: Auth screens skin (R3)

**Files:** `app/auth/sign-in.tsx`, `sign-up.tsx`, `forgot.tsx`.

- Navel-sparse: one Fraunces `display` title, form floats high, generous
  gaps, submit adopts `ready` from the existing form-validity boolean if
  present. Guest-first flows/handlers untouched.
- Commit `feat(mobile): auth screens adopt Dark Heritage (P5.6 R3)`.

### Task 8: Trips · Saved · Account · booking detail polish (R3)

**Files:** `(tabs)/trips.tsx`, `(tabs)/saved.tsx`, `(tabs)/account.tsx`,
`app/bookings/[code]/index.tsx`.

- Trips rows: status Badge overlaid on the leading thumbnail IF the VM has
  an image; otherwise badge stays in the text block (no VM changes).
- Saved: cards through ScrimImage treatment (likely already via SavedMini/
  TourCard — verify + gap polish).
- Account: section list token pass, avatar block, version footer muted.
- Booking detail: key-value blocks on `secondary` cards, Fraunces section
  titles; actions (Pay now / cancel / request) UNTOUCHED handlers.
- Commit `feat(mobile): trips/saved/account/booking-detail skin (P5.6 R3)`.

### Task 9: Full gate + STATUS + hand-off

- Kill orphan node → `pnpm nx run-many -t lint typecheck test` +
  `build --exclude=@tourism/mobile` → green; record counts.
- Update THIS plan's STATUS (state · counts · deviations) + commit
  `docs(plan): P5.6 R2+R3 STATUS`.
- Hand off for the user's full visual compare vs the Navel exports
  (`.png/Navel`), then rebase + `--ff-only` merge + docs sweep (CHANGELOG ·
  roadmap P5.6 cell · CLAUDE.md row · HANDOFF · memory).
