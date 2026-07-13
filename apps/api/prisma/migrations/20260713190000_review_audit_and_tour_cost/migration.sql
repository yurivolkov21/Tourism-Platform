-- API-W3: review moderation audit + per-traveller tour cost (margin analytics).
ALTER TABLE "reviews" ADD COLUMN "moderated_by" UUID;
ALTER TABLE "reviews" ADD COLUMN "moderated_at" TIMESTAMP(3);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_fkey"
  FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tours" ADD COLUMN "cost_price" DECIMAL(12,2);
