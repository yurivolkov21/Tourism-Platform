-- P1.x-b — orphaned-Cloudinary-asset queue (ADR-0007).
-- `MediaService` records a dropped (and not recreated) asset's public_id here in
-- the same tx as the delete; a pg-boss cron destroys it on Cloudinary and removes
-- the row. `id` carries a DB default for consistency with `outbox`. `public_id`
-- is UNIQUE so duplicate pending entries collapse (ON CONFLICT DO NOTHING).

-- CreateTable
CREATE TABLE "media_garbage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_id" VARCHAR(300) NOT NULL,
    "resource_type" VARCHAR(10) NOT NULL DEFAULT 'image',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_garbage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_garbage_public_id_key" ON "media_garbage"("public_id");
