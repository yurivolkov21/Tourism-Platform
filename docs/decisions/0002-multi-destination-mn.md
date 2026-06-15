# ADR-0002 — Tour ↔ Destination is M:N (D1)

**Status:** Accepted · **Date:** 2026-06-14

## Context

Lily-style packages span multiple destinations (e.g. "Hanoi → Angkor"). The donor
modeled Tour→Destination as 1:N, which can't express multi-destination packages.

## Decision

Model **Tour ↔ Destination as many-to-many** via a join `TourDestination(tourId,
destinationId, isPrimary)`. `isPrimary` marks the lead destination for listings.

## Consequences

- Supports multi-destination packages; listing/detail queries + DTO/zod shapes
  differ from the donor's 1:N — **do not port tours.service verbatim**.
- If we ever sell only single-place tours, this collapses to 1:N cleanly.
