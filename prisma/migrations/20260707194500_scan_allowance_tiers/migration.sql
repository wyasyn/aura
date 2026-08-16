-- Rename ScanTier enum values to product names
ALTER TYPE "ScanTier" RENAME VALUE 'start' TO 'starter';
ALTER TYPE "ScanTier" RENAME VALUE 'regular' TO 'thinking';

-- Default tier for new users
ALTER TABLE "user" ALTER COLUMN "scanTier" SET DEFAULT 'starter';

-- CreateEnum
CREATE TYPE "ScanLedgerReason" AS ENUM ('signup_bonus', 'admin_grant', 'pack_grant', 'scan_debit', 'tier_upgrade', 'adjustment');

-- CreateTable
CREATE TABLE "scan_balance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "lifetimeUsed" INTEGER NOT NULL DEFAULT 0,
    "lifetimeGranted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_pack" (
    "id" TEXT NOT NULL,
    "tier" "ScanTier" NOT NULL,
    "scanCount" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "ScanLedgerReason" NOT NULL,
    "tier" "ScanTier" NOT NULL,
    "scanId" TEXT,
    "packId" TEXT,
    "grantedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_balance_userId_key" ON "scan_balance"("userId");

-- CreateIndex
CREATE INDEX "scan_pack_tier_isActive_idx" ON "scan_pack"("tier", "isActive");

-- CreateIndex
CREATE INDEX "scan_ledger_userId_idx" ON "scan_ledger"("userId");

-- CreateIndex
CREATE INDEX "scan_ledger_scanId_idx" ON "scan_ledger"("scanId");

-- AddForeignKey
ALTER TABLE "scan_balance" ADD CONSTRAINT "scan_balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_ledger" ADD CONSTRAINT "scan_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_ledger" ADD CONSTRAINT "scan_ledger_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_ledger" ADD CONSTRAINT "scan_ledger_packId_fkey" FOREIGN KEY ("packId") REFERENCES "scan_pack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_ledger" ADD CONSTRAINT "scan_ledger_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop token tables (domain reset handled separately for scan data)
DROP TABLE "token_ledger";
DROP TABLE "token_wallet";
DROP TYPE "TokenLedgerReason";
