-- P1.7e — tour merchandising (donor/Lily's): who the tour suits + card badges.
-- Enum arrays, defaulted to empty so existing rows are unaffected.

-- CreateEnum
CREATE TYPE "TravellerType" AS ENUM ('FAMILY', 'COUPLE', 'FRIENDS', 'SOLO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "TourBadge" AS ENUM ('BEST_VALUE', 'LIMITED_OFFER', 'EXCLUSIVE', 'NEW', 'POPULAR');

-- AlterTable
ALTER TABLE "tours"
  ADD COLUMN "suitable_for" "TravellerType"[] NOT NULL DEFAULT ARRAY[]::"TravellerType"[],
  ADD COLUMN "badges" "TourBadge"[] NOT NULL DEFAULT ARRAY[]::"TourBadge"[];
