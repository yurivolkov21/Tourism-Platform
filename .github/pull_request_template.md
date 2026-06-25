<!-- One feature = one branch → PR → review → merge. See docs/04-guides/conventions.md -->

## What & why

<!-- What does this PR do, and why? Link any spec/plan under docs/ or an issue. -->

## Type

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] test
- [ ] chore

## How to test

<!-- Steps for a reviewer to verify. Note the app/route and any env needed. -->

## Checklist

- [ ] Branched off `main` (not committing straight to it)
- [ ] `pnpm nx affected -t lint typecheck test build` passes locally (CI runs it too)
- [ ] No raw hex — styling uses `@tourism/tokens` (`pnpm check:no-hex`)
- [ ] User-facing copy added to `@tourism/i18n` (EN-only)
- [ ] Tests added/updated for new logic (TDD on pure logic)
- [ ] Docs updated if behaviour/setup changed
- [ ] Screenshots / screen recording for UI changes (light + dark)
