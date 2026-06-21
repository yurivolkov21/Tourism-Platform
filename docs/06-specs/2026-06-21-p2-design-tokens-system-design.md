# Spec — P2 Design Token System (`@tourism/tokens` as single source of truth)

**Date:** 2026-06-21 · **Phase:** P2 (design system) · **Status:** DRAFT for review (no code yet)

> Companion to the shipped [shadcn (Base UI) foundation](2026-06-20-p2-ui-foundation-shadcn-baseui.md).
> That gave us components + a shadcn-generated color/radius theme living in each app's `global.css`.
> This spec defines the **full token system** and moves the source of truth into `@tourism/tokens`.

## Goal

A platform-neutral token layer in `@tourism/tokens` that **generates** web CSS variables (and later
React Native theme), so web, admin, and mobile stay visually consistent in **type, spacing, color,
elevation, motion, and more** — with components consuming only semantic tokens, never raw values.

## Decisions locked (this conversation)

- **Source of truth = `@tourism/tokens`** (TS/JSON), generated → web CSS vars (+ RN later). Not CSS-first.
- **Scope = full token system** (all groups below), not just the core three.
- **Generator = Style Dictionary** — optimal for "author once → multi-platform" (web CSS vars + RN);
  custom transforms/formats handle `oklch` (web) and dp/hex (RN). A hand-rolled script would only
  win for a web-only project, which this is not.
- **Build order = Approach A ("framework first, taste later").** Stand up the token architecture +
  generator with **neutral default values** (keep shadcn's neutral palette + standard scales, plus a
  *provisional* primary color and font so it isn't pure gray). Brand "taste" is a values-only swap
  later (the whole point of tokens) — see §6 design-direction.

## 1. Architecture — tiering & generation

**Two primary tiers (+ optional component tier):**

| Tier | Role | Example |
| --- | --- | --- |
| **Primitive** | Raw, context-free palette/scales | `blue.500`, `space.4`, `size.text.3`, `radius.base` |
| **Semantic** | Role-based; components use ONLY these | `color.primary`, `color.text.muted`, `space.section`, `radius.card` |
| **Component** (opt-in) | Per-widget override when justified | `button.height.md`, `input.border` |

**Generation pipeline (proposed):**

- Tokens authored as typed TS objects in `libs/shared/tokens/src`.
- A build step emits:
  - `tokens.css` — `:root` + `.dark` CSS custom properties (consumed by Tailwind v4 `@theme`).
  - `theme.ts` — JS object for React Native (numbers in dp, color strings).
- Web `global.css` becomes **generated output** (the per-app shadcn token block is migrated here);
  apps import the generated CSS. Hand-editing the generated file is disallowed.
- **Generator = Style Dictionary** (locked). Authored TS tokens → SD transforms → `tokens.css` +
  `theme.ts`. Wire as an Nx target so it regenerates on token change.

**Naming convention:** dot/kebab semantic names, predictable: `color-text-muted`, `space-section`,
`radius-card`, `shadow-overlay`, `z-modal`, `duration-fast`. Map cleanly to Tailwind v4 `@theme` keys.

## 2. Token groups (full system)

For each: **status today** → **what to define**.

### 2.1 Color — *have (shadcn), extend*

- Brand: `primary`, `secondary`, `accent` (+ foreground pairs).
- Surfaces: `background`, `card`, `popover`, `muted` (+ foregrounds).
- **Status colors (add):** `success`, `warning`, `error` (have `destructive`), `info` — each with
  foreground + subtle/solid variants.
- Lines: `border`, `input`, `ring`. Data viz: `chart.1–5`. Sidebar set (admin).
- Rules: every surface has an AA-contrast foreground; light + `.dark` parity.

### 2.2 Typography — *mostly missing (biggest gap)*

- **Families:** `font.sans` (Geist, set) · decide a distinct `font.heading` for brand character ·
  `font.mono` (code/IDs).
- **Size scale:** xs → 4xl/5xl on a fixed ratio (propose ~1.2 minor-third; confirm in direction).
- **Line-height** per size, **letter-spacing** (negative on large headings), **font-weight** roles
  (e.g. body 400, label/medium 500, heading 600/700).
- **Text styles (composite):** `display`, `heading-1…4`, `body`, `body-sm`, `label`, `caption`,
  `overline` — so usage is "one token", not 4 classes.
- Fluid type (`clamp`) for hero/display — optional, decide in direction.

### 2.3 Spacing & layout — *missing*

- Spacing scale (4px base; pick which steps are canonical for gap/padding).
- `container.max`, `gutter`, `space.section` (rhythm between major blocks).
- Grid: column count + behavior per breakpoint.

### 2.4 Sizing — *partly have*

- **Radius:** full scale already derived from `--radius` ✅ (keep).
- `border.width` steps; **control heights** (button/input/select unified); **icon sizes**
  (16/20/24); **avatar sizes**.

### 2.5 Elevation / shadow — *missing*

- Shadow scale by intent: `card`, `dropdown`, `popover`, `modal` — not ad-hoc shadows.
- Dark-mode rule: reduce/disable shadows in dark, lean on `border` for separation instead.

### 2.6 Motion — *missing*

- `duration` (fast/normal/slow), `easing` (standard ease-out, emphasized), reduced-motion rule.

### 2.7 Breakpoints — *defaults today*

- Canonical set + names (e.g. 360/640/768/1024/1280/1536), shared mental model with mobile.

### 2.8 Z-index — *missing*

- Named layer scale: `base/dropdown/sticky/overlay/modal/toast` to prevent z-index wars.

### 2.9 Opacity & states — *partly have*

- `opacity.disabled`, hover/active deltas, focus-ring spec (have `--ring`).

### 2.10 Iconography — *chosen*

- Lucide only; default size + stroke width as tokens.

### 2.11 Density — *important (Admin)*

- Two densities: comfortable (customer site) vs compact (admin tables); token-switchable spacing
  and control heights.

### 2.12 Overlay / scrim — *missing*

- Modal/sheet backdrop color + opacity; optional `backdrop-blur` (only if a glass direction is chosen).

### 2.13 Accessibility — *partly have*

- Focus-ring width + offset (have `--ring` color); **min touch target 44px** (critical for mobile);
  disabled opacity. WCAG AA contrast enforced on text/surface pairs.

### 2.14 Loading — *missing*

- Skeleton/shimmer color + animation; spinner color (already have a `spinner` component).

### 2.15 Content / prose — *missing*

- Reading measure (max line length) + rich-text styles (heading/list/paragraph spacing inside long
  content) for **tour descriptions, itineraries, blog**.

### 2.16 Gradient & image-scrim — *missing (tourism-relevant)*

- Reusable overlay/gradient tokens for **legible text on photos** (hero, tour cards) — very common
  on travel sites; standardize so contrast stays consistent.

### 2.17 Misc UI surfaces — *missing*

- Text selection highlight, scrollbar, and caret colors — small, but visibly inconsistent if skipped.

## 3. Cross-platform (web + RN mobile)

- Author once (TS), generate per platform. Units: web `rem`/`oklch`; RN numbers (dp) + color strings.
- Color space: keep `oklch` for web; provide hex/rgb fallback for RN export.
- No CSS-only tokens (RN can't read CSS) — everything must round-trip through the TS source.

## 4. Tourism-specific semantic tokens

- **Price:** `color.price`, `color.price.compare` (strikethrough), emphasis weight.
- **Rating:** star filled/empty colors, size.
- **Badges:** map BE `TourBadge` (bestseller / sold-out / new…) → color + intent.
- **Departure status:** available / filling / full → status colors.
- **Media aspect ratios:** card (e.g. 4:3), hero (e.g. 16:9), thumbnail — as tokens.

### 4.1 Formatting conventions (not visual tokens, but part of "consistency")

- **Price/currency, date/time, numbers** must render through shared formatters (tied to i18n /
  `@tourism/i18n`), not ad-hoc per component — otherwise prices/dates drift across surfaces.
- Out of scope to *implement* here, but recorded so the design system and i18n stay aligned.

## 5. Consumption rules (guardrails)

- Components MUST use semantic tokens; **no raw hex/px/oklch** in component code (CLAUDE.md "no hex").
- Consider a lint/Stylelint guard + review checklist to enforce.
- `@tourism/tokens` is the only source; generated CSS/theme files are build artifacts.

## 6. Open decisions → defer to "design direction" step

These need a taste/brand call (the user's), not an engineering default:

- Visual direction (editorial / luxury / clean-modern…), real brand palette.
- Heading font choice; type-scale ratio; radius personality (sharp vs soft).
- Fluid type yes/no; density default for customer site.

## 7. Phased rollout (proposed)

1. **Foundation:** tokens package structure + generator + migrate existing shadcn color/radius into it.
2. **Core scales:** typography, spacing/layout, elevation, motion.
3. **System completion:** z-index, density, states, breakpoints, iconography.
4. **Tourism semantics:** price/rating/badge/status/aspect-ratio tokens.
5. **RN export** (when mobile work starts).

## 8. Acceptance criteria (for the eventual implementation, not this draft)

- [ ] `@tourism/tokens` exports typed primitive + semantic tokens; builds via Nx.
- [ ] Generated `tokens.css` consumed by web/admin Tailwind v4 `@theme`; shadcn theme migrated, not duplicated.
- [ ] No raw hex/px in `@tourism/ui` components (audit/guard).
- [ ] Light + dark parity; AA contrast on text/background pairs.
- [ ] Gate green; module boundaries intact.
- [ ] RN export shape stubbed/validated (even if mobile not built yet).

## Out of scope

- Final brand palette / visual direction (separate design-direction decision).
- Rebuilding real product pages.
- Mobile app implementation (only the token export contract is considered).
