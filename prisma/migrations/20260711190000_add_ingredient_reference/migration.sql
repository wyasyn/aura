-- CreateTable
CREATE TABLE "ingredient" (
    "id" TEXT NOT NULL,
    "inciName" TEXT NOT NULL,
    "displayName" TEXT,
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetConcerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suitableSkinTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "climateTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "doshaAffinities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_inciName_key" ON "ingredient"("inciName");

-- CreateIndex
CREATE INDEX "ingredient_targetConcerns_idx" ON "ingredient"("targetConcerns");
