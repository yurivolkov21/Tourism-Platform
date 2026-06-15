-- Hardening DDL that Prisma's schema can't express (ADR-0008).
-- DESIGN-FIRST: not applied yet — folded into the init migration when the DB
-- lands (D-P1.6). After the first `prisma migrate`, run this as a follow-up
-- migration (or append to the init migration's SQL before first apply), then
-- update schema.prisma where noted so Prisma doesn't report drift.

-- ── citext: case-insensitive unique email (ADR-0008) ─────────────────────────
-- After enabling, change User.email to `@db.Citext` in schema.prisma + add
-- `extensions = [citext]` to the datasource (postgresqlExtensions) so Prisma owns it.
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE users ALTER COLUMN email TYPE citext;

-- ── CHECK constraints (bounded values) ───────────────────────────────────────
ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE tour_departures
  ADD CONSTRAINT departures_seats_nonneg CHECK (seats_total >= 0 AND seats_booked >= 0),
  ADD CONSTRAINT departures_seats_within_total CHECK (seats_booked <= seats_total);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_amount_nonneg CHECK (total_amount >= 0),
  ADD CONSTRAINT bookings_adults_min CHECK (num_adults >= 1),
  ADD CONSTRAINT bookings_children_nonneg CHECK (num_children >= 0);

ALTER TABLE tours
  ADD CONSTRAINT tours_base_price_nonneg CHECK (base_price >= 0),
  ADD CONSTRAINT tours_duration_min CHECK (duration_days >= 1),
  ADD CONSTRAINT tours_group_min CHECK (max_group_size >= 1);

-- ── Row-Level Security: enable on every table (defense-in-depth) ─────────────
-- The API connects with the service role, which BYPASSES RLS — these are a
-- backstop if a direct/anon path ever appears. Default deny (no policies).
-- Add explicit read policies (e.g. published tours for anon) only if a
-- Supabase-client read path is introduced.
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_destinations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_departures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_faqs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets       ENABLE ROW LEVEL SECURITY;
