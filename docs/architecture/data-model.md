# Data model

Clean redesign, donor-informed. **Canonical spec: [BLUEPRINT §6](../BLUEPRINT.md#6-new-data-model-clean-lily-informed).**

> Skeleton — the ERD + entity detail land with `schema.prisma` in **P1.1**.

## Key deltas vs donor

- **Tour ↔ Destination M:N** with `isPrimary` — multi-destination packages ([ADR-0002](../decisions/0002-multi-destination-mn.md)).
- **Enquiry** — "Inquire Now" lead capture ([ADR-0003](../decisions/0003-enquiry.md)).
- **Price anchoring** — `compareAtPrice` on Tour and/or Departure.
- **Value/content** — `highlights`, `TourFaq`, policies.

## Entities (overview)

Port-as-is (donor bones): `User · Destination · TourItineraryDay · TourDeparture · Booking · Review · Wishlist · PaymentEvent · MediaAsset`.
New/changed: `TourDestination (M:N)` · `TourFaq` · `Enquiry` · policy fields.

📝 *Entity tables, enums, indexes, ERD diagram — fill in P1.1. Open shape decisions: [decisions §open](../decisions/README.md) (D-P1.1…D-P1.3).*
