# ADR-0005 — English-only (drop EN/VI bilingual)

**Status:** Accepted · **Date:** 2026-06-15 · **Supersedes:** the original "EN/VI parity" decision (BLUEPRINT §2)

## Context

The founding plan committed to EN/VI parity (bilingual `*_en`/`*_vi` columns,
parity-checked i18n catalogs). The product is now targeted **English-only** for
the first build.

## Decision

Ship **English-only**:

- **Schema:** single-language columns — drop every `*_vi` column; `name`,
  `title`, `summary`, `description`, etc. are plain text. Array content
  (`highlights`, `included`, `excluded`) → Postgres `text[]` (resolves D-P1.2).
- **i18n lib:** **keep `@tourism/i18n` as an EN-only copy catalog** (centralized
  strings), but drop the VI catalog + the parity-check discipline. The lib stays
  so re-adding a locale later is additive, not a refactor.
- **User.locale / `Locale` enum:** keep a `locale` column defaulting to `en`
  (door open), no enforced multi-locale behavior.
- **Emails:** EN templates only.

## Consequences

- Simpler schema (no column doubling), no parity gate in CI.
- "EN/VI parity" convention is removed from CLAUDE.md / conventions.
- Re-adding VI later = add catalog + columns/translations table (revisit then).
