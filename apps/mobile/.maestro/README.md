# Maestro flows — mobile device pass (UNVERIFIED)

Authored 2026-07-09 (P5.5 N3) as ready-to-run UI-navigation flows for the
combined device pass. **They have NOT been executed** — the authoring session
had no Maestro / JDK / adb / Android SDK / emulator — so treat every selector
as best-effort and fix the first run.

## What these cover (and what they can't)

Maestro drives the **UI navigation** only:

- `01-tabs-and-home-guest.yaml` — 5-tab bar · task-first Home for a guest ·
  search pill → Explore · Trips tab auth gate.
- `02-explore-filter-sheet.yaml` — N2 filter bottom sheet (open → toggle →
  apply → active-count badge).
- `03-tour-detail-show-all.yaml` — N2 progressive disclosure ("Show all") +
  enquiry sheet.
- `04-home-signed-in.yaml` — N3 signed-in Home context rows (needs a test
  account; see below).

They **cannot** verify: N1 *feel* (ripple, haptics, font rendering), image
fade-in, or the real Stripe/PayPal **payment loop** — those stay a manual pass
(see the checklist in the plan / chat). Use these to catch navigation/IA
regressions fast; keep the manual list for the rest.

## Prerequisites (install once)

1. **JDK 17+** on `PATH` (`java -version`).
2. **Android platform-tools** (`adb`) on `PATH`.
3. **Maestro CLI**: `curl -Ls "https://get.maestro.mobile.dev" | bash`
   (Windows: use WSL, or the PowerShell instructions on maestro.mobile.dev).
4. A **running target**: either a physical phone with **USB debugging** on
   (`adb devices` lists it) or a started Android emulator.

## Running (Expo Go workflow)

This app has **no standalone/dev build** — it runs inside **Expo Go**, so the
`appId` in every flow is `host.exp.exponent` (Expo Go itself) and the flows
**assume the app is already open on the Home tab**. They deliberately omit
`launchApp` (Expo Go can't be deep-linked to a dev-server project reliably).

```bash
# 1. Start Metro + open the app in Expo Go on the target (as usual):
cd apps/mobile && pnpm exec expo start   # scan / open on the device
# 2. With the app sitting on the Home tab, from apps/mobile/.maestro:
maestro test 01-tabs-and-home-guest.yaml
maestro test 02-explore-filter-sheet.yaml
maestro test 03-tour-detail-show-all.yaml
# signed-in flow needs creds:
maestro test -e EMAIL=you@test.dev -e PASSWORD=secret 04-home-signed-in.yaml
```

**If you later make an EAS dev build** (`eas build --profile development`):
swap `appId: host.exp.exponent` → the real Android package and add a first
`- launchApp` (or `- openLink: nexora://` — the app scheme) to each flow; then
they run without opening Expo Go by hand.

## First-run fixes to expect

- Selectors: tab labels + section headings are stable copy; the **auth-screen
  field selectors in `04`** (`Email` / `Password` / submit `Sign in`) are
  best-guess — reconcile with `apps/mobile/src/app/auth/sign-in.tsx`.
- `03` opens the **first** tour by tapping its "From" price label — adjust if
  your seed data renders differently.
- Timing: add `- extendedWaitUntil` around the sheet opens if the cold Render
  API makes lists slow to populate.
