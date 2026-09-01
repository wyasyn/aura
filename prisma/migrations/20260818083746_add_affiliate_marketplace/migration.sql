-- CreateEnum
CREATE TYPE "AffiliateApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AffiliateOrderStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "affiliate_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "commissionRateBps" INTEGER NOT NULL DEFAULT 1000,
    "customerDiscountBps" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AffiliateApplicationStatus" NOT NULL DEFAULT 'pending',
    "howTheyPromote" TEXT NOT NULL,
    "website" TEXT,
    "rejectionReason" TEXT,
    "couponCode" TEXT,
    "wooCommerceCouponId" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_order" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "wooCommerceOrderId" INTEGER NOT NULL,
    "status" "AffiliateOrderStatus" NOT NULL DEFAULT 'pending',
    "couponCode" TEXT NOT NULL,
    "orderTotalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "commissionRateBpsSnapshot" INTEGER NOT NULL,
    "commissionAmountCents" INTEGER NOT NULL,
    "customerEmail" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_payout" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profile_userId_key" ON "affiliate_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profile_couponCode_key" ON "affiliate_profile"("couponCode");

-- CreateIndex
CREATE INDEX "affiliate_profile_status_idx" ON "affiliate_profile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_order_wooCommerceOrderId_key" ON "affiliate_order"("wooCommerceOrderId");

-- CreateIndex
CREATE INDEX "affiliate_order_affiliateId_status_idx" ON "affiliate_order"("affiliateId", "status");

-- CreateIndex
CREATE INDEX "affiliate_payout_affiliateId_idx" ON "affiliate_payout"("affiliateId");

-- AddForeignKey
ALTER TABLE "affiliate_profile" ADD CONSTRAINT "affiliate_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_profile" ADD CONSTRAINT "affiliate_profile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_order" ADD CONSTRAINT "affiliate_order_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliate_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payout" ADD CONSTRAINT "affiliate_payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliate_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payout" ADD CONSTRAINT "affiliate_payout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
