-- Hardening migration (ADR-0008): citext email + CHECK constraints + RLS.
-- Replaces Prisma's drop/recreate of users.email with an in-place ALTER TYPE
-- (varchar → citext casts cleanly and preserves the existing unique index).

-- ── citext: case-insensitive unique email ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE "users" ALTER COLUMN "email" TYPE CITEXT;

-- ── CHECK constraints (bounded values) ───────────────────────────────────────
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "tour_departures"
  ADD CONSTRAINT "departures_seats_nonneg" CHECK ("seats_total" >= 0 AND "seats_booked" >= 0),
  ADD CONSTRAINT "departures_seats_within_total" CHECK ("seats_booked" <= "seats_total");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_amount_nonneg" CHECK ("total_amount" >= 0),
  ADD CONSTRAINT "bookings_adults_min" CHECK ("num_adults" >= 1),
  ADD CONSTRAINT "bookings_children_nonneg" CHECK ("num_children" >= 0);

ALTER TABLE "tours"
  ADD CONSTRAINT "tours_base_price_nonneg" CHECK ("base_price" >= 0),
  ADD CONSTRAINT "tours_duration_min" CHECK ("duration_days" >= 1),
  ADD CONSTRAINT "tours_group_min" CHECK ("max_group_size" >= 1);

-- ── Row-Level Security: enable on every table (defense-in-depth) ─────────────
-- API connects with the service role, which BYPASSES RLS — this is a backstop.
-- Default deny (no policies). Add read policies only if a Supabase-client path appears.
ALTER TABLE "users"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_categories"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "destinations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tours"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_destinations"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_itinerary_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_departures"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_faqs"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tour_policies"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wishlist"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiries"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_assets"        ENABLE ROW LEVEL SECURITY;
