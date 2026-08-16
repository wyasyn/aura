-- Per-plan usage counters. Lifetime totals stay untouched so history survives.
ALTER TABLE "scan_balance"
  ADD COLUMN "periodUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "periodGranted" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "periodStartedAt" TIMESTAMP(3);

-- Seed the first period from lifetime totals so existing balances read the
-- same as before until the next pack purchase starts a fresh period.
UPDATE "scan_balance"
SET "periodUsed" = "lifetimeUsed",
    "periodGranted" = "lifetimeGranted",
    "periodStartedAt" = "createdAt";
