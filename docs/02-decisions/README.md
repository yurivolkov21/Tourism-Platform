# Decisions (ADR log)

One Architecture Decision Record per file: `NNNN-kebab-title.md`. Locked records
are the contract; open questions block the work that depends on them. Structural
decisions also fold into [../BLUEPRINT.md](../BLUEPRINT.md) / [../01-architecture/](../01-architecture/README.md).

## Locked ✅

| ADR | Decision | Date |
| --- | --- | --- |
| [0001](0001-greenfield-donor.md) | Greenfield rebuild + donor as read-only reference | 2026-06-14 |
| [0002](0002-multi-destination-mn.md) | Tour ↔ Destination **M:N** with `isPrimary` (D1) | 2026-06-14 |
| [0003](0003-enquiry.md) | **Enquiry** model + "Inquire Now" lead form (D2) | 2026-06-14 |
| [0004](0004-admin-reuses-web-ui.md) | admin may reuse `web/ui` (D3) | 2026-06-14 |
| [0005](0005-en-only.md) | **English-only** — drop EN/VI bilingual (supersedes parity) | 2026-06-15 |
| [0006](0006-multi-gateway-momo.md) | **Multi-gateway** payments: Stripe + **PayPal** (amended from MoMo 2026-06-16) | 2026-06-15 |
| [0007](0007-pgboss-outbox-jobs.md) | **pg-boss** outbox + jobs (reliability) | 2026-06-15 |
| [0008](0008-security-integrity-hardening.md) | **Security & integrity hardening** (tighter than donor) | 2026-06-15 |

## Resolved (P1 — all closed) ✅

> **P1 backend is complete** (P1.1 → P1.x + P1.7d/e). All D-P1.* questions below are closed.

| ID | Question | Decision |
| --- | --- | --- |
| **D-P1.6** | Supabase project + DB + secrets | **Resolved 2026-06-15: NEW Supabase project** (donor untouched & still running — keeps ADR-0001 intact). Reusable secrets (Stripe/Cloudinary/Resend) copied from donor; Supabase keys = new project; PayPal/Sentry filled. `migrate` runs against live DB. |

> **Resolved 2026-06-15** (in P1.1):
>
> - **D-P1.1** `TourPolicy` → **separate model** (structured, reusable).
> - **D-P1.3** `compareAtPrice` → **both Tour + Departure**.
> - **D-P1.4** `Enquiry.status` → **NEW / CONTACTED / QUOTED / WON / LOST** (CRM).
> - **D-P1.5** `TourCategory` → **lookup table** (not enum; resolves R8).
> - **D-P1.2** (array content) → `text[]` ([ADR-0005](0005-en-only.md)) ·
>   **D-P1.7** → [ADR-0006](0006-multi-gateway-momo.md) ·
>   **D-P1.8** → [ADR-0007](0007-pgboss-outbox-jobs.md).

📝 *Promote an open row to a numbered ADR when decided.*
