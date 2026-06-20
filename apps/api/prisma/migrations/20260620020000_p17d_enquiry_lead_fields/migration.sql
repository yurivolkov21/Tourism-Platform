-- P1.7d — structured lead fields on enquiries (match the donor/Lily's inbound
-- form: nationality, preferred travel date, party size, budget tier, interests).
-- All nullable / defaulted so existing rows and general enquiries are unaffected.

ALTER TABLE "enquiries"
  ADD COLUMN "nationality" VARCHAR(80),
  ADD COLUMN "travel_date" DATE,
  ADD COLUMN "group_size" INTEGER,
  ADD COLUMN "budget_tier" VARCHAR(40),
  ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
