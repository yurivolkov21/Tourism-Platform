-- AlterEnum
ALTER TYPE "MediaOwnerType" ADD VALUE 'SITE';

-- CreateTable
CREATE TABLE "site_media_slots" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_media_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_media_slots_key_key" ON "site_media_slots"("key");

-- House rule: RLS on every table (access is enforced in the API layer).
ALTER TABLE "site_media_slots" ENABLE ROW LEVEL SECURITY;

-- Seed the brand-chrome slot catalog (idempotent — keys are the stable identity;
-- the kind/label/grouping catalog lives in API code, site-media/slot-catalog.ts).
INSERT INTO "site_media_slots" ("id", "key", "updated_at") VALUES
  (gen_random_uuid(), 'home-hero',         CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'home-experiences',  CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'home-why-choose',   CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'home-trust',        CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'cta-band',          CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'content-hero',      CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'destinations-hero', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'auth-panel',        CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'about-story',       CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
