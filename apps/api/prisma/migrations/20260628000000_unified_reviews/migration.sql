-- Unified reviews: support CURATED testimonials alongside VERIFIED booking reviews.
-- Additive + backward-compatible: new columns are nullable (or defaulted), the three FKs are relaxed
-- to nullable, and author_name is backfilled from the reviewer's full name before being made NOT NULL.

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('VERIFIED', 'CURATED');

-- AlterTable: new columns (author_name starts nullable so we can backfill, then SET NOT NULL)
ALTER TABLE "reviews"
  ADD COLUMN "author_name" VARCHAR(120),
  ADD COLUMN "author_location" VARCHAR(120),
  ADD COLUMN "source" "ReviewSource" NOT NULL DEFAULT 'VERIFIED',
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "trip_label" VARCHAR(160);

-- Backfill the display-name snapshot from the linked user.
UPDATE "reviews" r
  SET "author_name" = COALESCE(u."full_name", 'Anonymous')
  FROM "users" u
  WHERE r."user_id" = u."id";

-- Safety net for any unmatched row.
UPDATE "reviews" SET "author_name" = 'Anonymous' WHERE "author_name" IS NULL;

-- author_name is required from here on.
ALTER TABLE "reviews" ALTER COLUMN "author_name" SET NOT NULL;

-- Relax the FKs (a curated testimonial has no booking/user, and may not map to a DB tour).
ALTER TABLE "reviews" ALTER COLUMN "tour_id" DROP NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "booking_id" DROP NOT NULL;

-- CreateIndex: the homepage "featured" read filters on (is_approved, is_featured).
CREATE INDEX "reviews_is_approved_is_featured_idx" ON "reviews"("is_approved", "is_featured");
