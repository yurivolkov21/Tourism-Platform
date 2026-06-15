-- Hardening DDL that Prisma's schema can't express (ADR-0008).
-- ✅ APPLIED (2026-06-15) via migration `20260615071228_hardening` (citext +
-- CHECK + RLS on the 15 app tables). RLS on `_prisma_migrations` was applied
-- separately via a Supabase migration (rls_on_prisma_migrations_table) because
-- referencing that table inside a Prisma migration fails in the shadow DB.
-- This file is now REFERENCE-ONLY — the migration is the source of truth.
-- Note: after a `prisma migrate reset`, re-run the `_prisma_migrations` RLS line.

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
