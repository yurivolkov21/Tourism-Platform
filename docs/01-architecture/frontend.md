# Frontend (web · admin · mobile)

> Skeleton — fill in P2 (design system) / P3 (web) / P4 (admin) / P5 (mobile).

## Shared foundation

- **Tokens:** `@tourism/tokens` → web CSS vars + RN theme (no hex; tokens only).
- **i18n:** `@tourism/i18n` EN-only ([ADR-0005](../02-decisions/0005-en-only.md)).
- **Domain/data:** `@tourism/core` types · zod · API client (consumed by all three).
- **UI:** `@tourism/ui` (web, React) · `@tourism/mobile-ui` (RN). admin reuses `@tourism/ui`.

## Per-app

📝 *App Router structure, RSC/data-fetching, navigation — fill as apps are built.*
