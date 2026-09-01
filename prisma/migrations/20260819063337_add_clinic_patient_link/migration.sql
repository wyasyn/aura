-- CreateTable
CREATE TABLE "clinic_patient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_patient_userId_key" ON "clinic_patient"("userId");

-- CreateIndex
CREATE INDEX "clinic_patient_organizationId_idx" ON "clinic_patient"("organizationId");

-- AddForeignKey
ALTER TABLE "clinic_patient" ADD CONSTRAINT "clinic_patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_patient" ADD CONSTRAINT "clinic_patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
