-- Backfill the RLS invariant (every table shielded from non-owner roles; the
-- API connects as owner and bypasses it). These four slipped through their
-- original migrations — found by the Wave B2 adversarial review.
ALTER TABLE "cancellation_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_tag_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_tours" ENABLE ROW LEVEL SECURITY;
