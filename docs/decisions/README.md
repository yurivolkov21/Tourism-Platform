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
| [0005](0005-en-only.md) | **English-only** — drop EN/VI bilingual (supersedes parity) | 2026-06-15 |
| [0006](0006-multi-gateway-momo.md) | **Multi-gateway** payments: Stripe + **MoMo** | 2026-06-15 |
| [0007](0007-pgboss-outbox-jobs.md) | **pg-boss** outbox + jobs (reliability) | 2026-06-15 |
| [0008](0008-security-integrity-hardening.md) | **Security & integrity hardening** (tighter than donor) | 2026-06-15 |

## Open ⬜ (block P1)

| ID | Question | Recommendation |
| --- | --- | --- |
| **D-P1.1** | `TourPolicy` — separate model or text fields on `Tour`? | text fields; promote later if structured |
| **D-P1.3** | `compareAtPrice` at Tour and/or Departure level? | both, optional |
| **D-P1.4** | `Enquiry.status` enum values? | `NEW` / `CONTACTED` / `CLOSED` |
| **D-P1.5** | `TourCategory` enum — keep, revise, or lookup table? (risk R8) | start enum, revisit lookup if churny |
| **D-P1.6** | Supabase project + DB + **MoMo/Stripe/Cloudinary/Resend** secrets — new or reuse? | new project (clean); supply `.env` |

> Resolved: **D-P1.2** (array content) → `text[]` via [ADR-0005](0005-en-only.md);
> **D-P1.7** (VN gateway) → [ADR-0006](0006-multi-gateway-momo.md);
> **D-P1.8** (jobs) → [ADR-0007](0007-pgboss-outbox-jobs.md).

📝 *Promote an open row to a numbered ADR when decided.*
