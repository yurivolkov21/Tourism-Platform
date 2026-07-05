-- CreateTable
CREATE TABLE "subscribers" (
    "id" UUID NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "source" VARCHAR(40),
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_email_key" ON "subscribers"("email");

-- CreateIndex (W3 fast-follow: registerAsset upserts on this compound unique)
CREATE UNIQUE INDEX "media_assets_owner_type_owner_id_public_id_key" ON "media_assets"("owner_type", "owner_id", "public_id");

-- RowLevelSecurity: enable on subscribers (defense-in-depth; the API uses the
-- service role which BYPASSES RLS). Default deny, no policies — matches hardening.sql.
ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;
