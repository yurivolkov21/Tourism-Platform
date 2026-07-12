# docs/ — tourism-platform

**Start here.** This is the documentation map + the order to read it in.

🚀 **Just cloned the repo and want to run it?** → **[04-guides/getting-started.md](04-guides/getting-started.md)**
(clone → install → env per app → run web/admin/API → seed → test). Everything below is the deeper map.

> **Source-of-truth order:** code → these docs → AI notes. When a doc disagrees
> with the code (`apps/*/src`, `apps/api/prisma/schema.prisma`, the Swagger spec),
> **the code wins — fix the doc.**
>
> These are living docs. We **fill them as we go** — empty sections aren't debt;
> they get written when the matching work lands.

## 📖 Reading path

1. **[BLUEPRINT.md](BLUEPRINT.md)** — *why* greenfield+donor, locked decisions, the data model. The origin story.
2. **[roadmap.md](roadmap.md)** — phases P0–P6, short current status per phase.
3. **[CHANGELOG.md](CHANGELOG.md)** — full project history, reverse-chronological (one entry per merge to `main`).
4. **[01-architecture/](01-architecture/README.md)** — how the system is built (layout, boundaries, reuse engine, backend, data model, frontend).
5. **[04-guides/conventions.md](04-guides/conventions.md)** — how we work + which tools/skills to use.
6. **[02-decisions/](02-decisions/README.md)** — the decision log (ADRs) + open questions.

Then, as needed: **[03-reference/](03-reference/)** — function catalog ([admin](03-reference/functions-admin.md)/[customer](03-reference/functions-customer.md)/[system](03-reference/functions-system.md)) + reference-site research · **[05-runbooks/](05-runbooks/README.md)** (ops) · **[06-specs/](06-specs/)** + **[07-plans/](07-plans/)** (per-feature).

## 📂 Folder map

```text
docs/
├── README.md                  ← you are here (map + reading path)
├── BLUEPRINT.md               founding plan (why · decisions · data model)
├── roadmap.md                 phases P0–P6, short status (history → CHANGELOG)
├── CHANGELOG.md                  full project history (reverse-chronological)
├── 01-architecture/              how it's built (overview + data-model/backend/frontend/risks)
├── 02-decisions/                 ADR log (one decision per file)
├── 03-reference/                 function catalog (admin/customer/system) + reference-site research
├── 04-guides/                    getting-started · from-scratch-setup · conventions
├── 05-runbooks/                  operational how-tos (local-dev, deploy, env-and-secrets)
├── 06-specs/                     per-feature design specs (spec→plan→execute)
├── 07-plans/                     per-feature implementation plans
└── email-templates/              Supabase Auth email templates (HTML, configured in the dashboard)
```

## Doc language / Ngôn ngữ tài liệu

Deliberate split by document role (the team is Vietnamese students — native language where it's read most):

- 🇻🇳 **Tiếng Việt** — *read-to-understand & onboarding* docs: the function catalog
  ([03-reference/functions-*](03-reference/)) + the **"Bắt đầu nhanh"** section in the root
  [README](../README.md). These are read often, used to draw diagrams and write the report.
- 🇬🇧 **English** — *reference / contract* docs: architecture, decisions (ADRs), specs, plans, schema,
  BLUEPRINT. These track the code and stay stable.

> Identifiers (function names, endpoints, models, fields) are always English — they're code. Only the
> explanatory prose follows the language above. Keep a doc **single-language**; don't mix EN+VN in one file.

## Related (repo root)

- **[CLAUDE.md](../CLAUDE.md)** — the short operating contract for any agent/human.
- **[HANDOFF.md](../HANDOFF.md)** — *resume-here* session pointer (current state + next step).
