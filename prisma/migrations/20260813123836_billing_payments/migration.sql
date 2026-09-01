-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('mock', 'stripe');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "billing_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'mock',
    "providerRef" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tier" "ScanTier" NOT NULL,
    "scanCount" INTEGER NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "billingSnapshot" JSONB,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_profile_userId_key" ON "billing_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providerRef_key" ON "payment"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receiptNumber_key" ON "payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_userId_createdAt_idx" ON "payment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "billing_profile" ADD CONSTRAINT "billing_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_packId_fkey" FOREIGN KEY ("packId") REFERENCES "scan_pack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
