-- CreateTable
CREATE TABLE "ai_model_rate" (
    "id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT,
    "inputMicrosPer1M" INTEGER NOT NULL,
    "outputMicrosPer1M" INTEGER NOT NULL,
    "cachedInputMicrosPer1M" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_rate_provider_modelId_key" ON "ai_model_rate"("provider", "modelId");

-- CreateIndex
CREATE INDEX "ai_model_rate_isActive_idx" ON "ai_model_rate"("isActive");
