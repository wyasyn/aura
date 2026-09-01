-- CreateEnum
CREATE TYPE "ExpertSpecialty" AS ENUM ('dermatologist', 'ayurvedic_practitioner');

-- CreateEnum
CREATE TYPE "ExpertApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateTable
CREATE TABLE "expert_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialty" "ExpertSpecialty" NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "yearsExperience" INTEGER NOT NULL,
    "consultationPriceCents" INTEGER NOT NULL,
    "status" "ExpertApplicationStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "isAcceptingBookings" BOOLEAN NOT NULL DEFAULT true,
    "avgRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_availability_slot" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_availability_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending_payment',
    "notes" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'stripe',
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "paymentFailureReason" TEXT,
    "videoRoomUrl" TEXT,
    "videoRoomName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expert_profile_userId_key" ON "expert_profile"("userId");

-- CreateIndex
CREATE INDEX "expert_profile_specialty_status_idx" ON "expert_profile"("specialty", "status");

-- CreateIndex
CREATE INDEX "expert_profile_status_idx" ON "expert_profile"("status");

-- CreateIndex
CREATE INDEX "expert_availability_slot_expertId_isBooked_startTime_idx" ON "expert_availability_slot"("expertId", "isBooked", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "expert_availability_slot_expertId_startTime_key" ON "expert_availability_slot"("expertId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "booking_slotId_key" ON "booking"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_paymentRef_key" ON "booking"("paymentRef");

-- CreateIndex
CREATE INDEX "booking_userId_createdAt_idx" ON "booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "booking_expertId_createdAt_idx" ON "booking"("expertId", "createdAt");

-- CreateIndex
CREATE INDEX "booking_status_idx" ON "booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "expert_review_bookingId_key" ON "expert_review"("bookingId");

-- CreateIndex
CREATE INDEX "expert_review_expertId_createdAt_idx" ON "expert_review"("expertId", "createdAt");

-- AddForeignKey
ALTER TABLE "expert_profile" ADD CONSTRAINT "expert_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_profile" ADD CONSTRAINT "expert_profile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_availability_slot" ADD CONSTRAINT "expert_availability_slot_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "expert_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "expert_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "expert_availability_slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review" ADD CONSTRAINT "expert_review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review" ADD CONSTRAINT "expert_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_review" ADD CONSTRAINT "expert_review_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "expert_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
