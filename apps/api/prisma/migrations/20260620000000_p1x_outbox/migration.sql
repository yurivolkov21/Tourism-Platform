-- P1.x — transactional email outbox (ADR-0007).
-- Written atomically with the state change it announces (PAID confirmation inside
-- the seat-claim CTE; review-approved / enquiry-received in a short tx); drained
-- by the pg-boss worker. Idempotent on `dedupe_key` (ON CONFLICT DO NOTHING).
-- `id` carries a DB default so the raw-SQL CTE insert needs no client-side id.

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_REFUNDED', 'REVIEW_APPROVED', 'ENQUIRY_RECEIVED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "EmailType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "dedupe_key" VARCHAR(200) NOT NULL,
    "last_error" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_dedupe_key_key" ON "outbox"("dedupe_key");

-- CreateIndex
CREATE INDEX "outbox_status_created_at_idx" ON "outbox"("status", "created_at");
