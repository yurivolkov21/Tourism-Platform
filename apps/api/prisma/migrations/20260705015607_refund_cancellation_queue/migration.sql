-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('REQUESTED', 'REFUNDED', 'DENIED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailType" ADD VALUE 'CANCELLATION_REQUESTED';
ALTER TYPE "EmailType" ADD VALUE 'CANCELLATION_DENIED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "refunded_amount" DECIMAL(12,2),
ADD COLUMN     "refunded_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "cancellation_requests" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "decision_note" VARCHAR(500),
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_requests_booking_id_key" ON "cancellation_requests"("booking_id");

-- CreateIndex
CREATE INDEX "cancellation_requests_status_created_at_idx" ON "cancellation_requests"("status", "created_at");

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
