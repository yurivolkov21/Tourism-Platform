# docs/ — tourism-platform

**Start here.** This is the documentation map + the order to read it in.

> **Source-of-truth order:** code → these docs → AI notes. When a doc disagrees
> with the code (`apps/*/src`, `apps/api/prisma/schema.prisma`, the Swagger spec),
> **the code wins — fix the doc.**
>
> These are living docs. We **fill them as we go** — empty sections aren't debt;
> they get written when the matching work lands.

## 📖 Reading path

1. **[BLUEPRINT.md](BLUEPRINT.md)** — *why* greenfield+donor, locked decisions, the data model. The origin story.
2. **[roadmap.md](roadmap.md)** — phases P0–P6, current status, and the P1 backend breakdown.
3. **[architecture/](architecture/README.md)** — how the system is built (layout, boundaries, reuse engine, backend, data model, frontend).
4. **[guides/conventions.md](guides/conventions.md)** — how we work + which tools/skills to use.
5. **[decisions/](decisions/README.md)** — the decision log (ADRs) + open questions.

Then, as needed: **[reference/](reference/)** (research) · **[runbooks/](runbooks/README.md)** (ops) · **[specs/](specs/)** + **[plans/](plans/)** (per-feature).

## 🗂 Folder map

```text
docs/
├── README.md                  ← you are here (map + reading path)
├── BLUEPRINT.md               founding plan (why · decisions · data model)
├── roadmap.md                 phases P0–P6 + P1 breakdown
├── architecture/              how it's built (overview + data-model/backend/frontend)
├── guides/                    conventions + how-tos
├── decisions/                 ADR log (one decision per file)
├── runbooks/                  operational how-tos (local-dev, seed, deploy)
├── reference/                 external research (reference-site analysis)
├── specs/                     per-feature design specs (spec→plan→execute)
└── plans/                     per-feature implementation plans
```

## Related (repo root)

- **[CLAUDE.md](../CLAUDE.md)** — the short operating contract for any agent/human.
- **[HANDOFF.md](../HANDOFF.md)** — *resume-here* session pointer (current state + next step).
