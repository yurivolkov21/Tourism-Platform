# Decisions (ADR log)

One Architecture Decision Record per file: `NNNN-kebab-title.md`. Locked records
are the contract; open questions block the work that depends on them. Structural
decisions also fold into [../BLUEPRINT.md](../BLUEPRINT.md) / [../architecture/](../architecture/README.md).

## Locked ✅

| ADR | Decision | Date |
| --- | --- | --- |
| [0001](0001-greenfield-donor.md) | Greenfield rebuild + donor as read-only reference | 2026-06-14 |
| [0002](0002-multi-destination-mn.md) | Tour ↔ Destination **M:N** with `isPrimary` (D1) | 2026-06-14 |
| [0003](0003-enquiry.md) | **Enquiry** model + "Inquire Now" lead form (D2) | 2026-06-14 |
| [0004](0004-admin-reuses-web-ui.md) | admin may reuse `web/ui` (D3) | 2026-06-14 |

## Open ⬜ (block P1)

| ID | Question | Recommendation |
| --- | --- | --- |
| **D-P1.1** | `TourPolicy` — separate model or bilingual text fields on `Tour`? | text fields; promote later if structured |
| **D-P1.2** | `highlights`/`included`/`excluded` — `Json {en,vi}` or two `*_en`/`*_vi` columns? | two columns (donor pattern) |
| **D-P1.3** | `compareAtPrice` at Tour and/or Departure level? | both, optional |
| **D-P1.4** | `Enquiry.status` enum values? | `NEW` / `CONTACTED` / `CLOSED` |
| **D-P1.5** | `TourCategory` enum — keep donor's or revise for Lily? | review donor set, adjust |
| **D-P1.6** | Supabase project + DB — new or reuse donor's? Secrets source? | new project (clean); supply `.env` |

📝 *Promote an open row to a numbered ADR when decided.*
