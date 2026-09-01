-- CreateEnum
CREATE TYPE "IngredientRole" AS ENUM ('active', 'humectant', 'emollient', 'occlusive', 'exfoliant', 'antioxidant', 'surfactant', 'preservative', 'fragrance', 'solvent', 'unspecified');

-- CreateEnum
CREATE TYPE "IngredientSource" AS ENUM ('botanical', 'mineral', 'marine', 'microbial', 'synthetic', 'animal_derived', 'unspecified');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('unverified', 'imported', 'confirmed');

-- CreateEnum
CREATE TYPE "RoutineCategory" AS ENUM ('cleanser', 'exfoliant', 'toner', 'essence', 'serum', 'treatment', 'moisturiser', 'oil', 'mask', 'sunscreen', 'haircare', 'bodycare', 'other');

-- CreateEnum
CREATE TYPE "ProductAvailability" AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'discontinued', 'unknown');

-- AlterTable
ALTER TABLE "ingredient" ADD COLUMN     "avoidWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "functions" "IngredientRole"[] DEFAULT ARRAY[]::"IngredientRole"[],
ADD COLUMN     "source" "IngredientSource" NOT NULL DEFAULT 'unspecified';

-- AlterTable: add the new columns first, so the classification data has
-- somewhere to go before the old column is dropped below.
ALTER TABLE "product" ADD COLUMN     "amSuitable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availability" "ProductAvailability" NOT NULL DEFAULT 'unknown',
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "classificationConfidence" "DataConfidence" NOT NULL DEFAULT 'unverified',
ADD COLUMN     "completenessScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cosmeticBenefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "environmentalNotes" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "pmSuitable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "primaryClassification" "ProductClassification",
ADD COLUMN     "routineCategory" "RoutineCategory",
ADD COLUMN     "routineStep" INTEGER,
ADD COLUMN     "secondaryClassifications" "ProductClassification"[] DEFAULT ARRAY[]::"ProductClassification"[],
ADD COLUMN     "suitableHumidity" "ClimateBand"[] DEFAULT ARRAY[]::"ClimateBand"[],
ADD COLUMN     "suitableTemperature" "ClimateBand"[] DEFAULT ARRAY[]::"ClimateBand"[],
ADD COLUMN     "suitableUv" "ClimateBand"[] DEFAULT ARRAY[]::"ClimateBand"[],
ADD COLUMN     "verificationStatus" "DataConfidence" NOT NULL DEFAULT 'unverified';

-- Carry any existing classifications across before the column goes.
--
-- No row in the database this was written against had one set, so this is a
-- no-op there. It is here so the migration is still correct if it is replayed
-- against a database where products had been classified — a developer's local
-- copy, or a restored backup. A restructure that silently discards the data it
-- is restructuring is not a restructure.
UPDATE "product"
SET "primaryClassification" = "classifications"[1],
    "secondaryClassifications" = "classifications"[2:],
    -- The values came from somewhere, so they are more than unverified, but
    -- nobody has confirmed them against a label either.
    "classificationConfidence" = 'imported'
WHERE array_length("classifications", 1) > 0;

-- AlterTable
ALTER TABLE "product" DROP COLUMN "classifications";

-- CreateTable
CREATE TABLE "product_ingredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "position" INTEGER,
    "role" "IngredientRole" NOT NULL DEFAULT 'unspecified',
    "isKeyActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_ingredient_ingredientId_idx" ON "product_ingredient"("ingredientId");

-- CreateIndex
CREATE INDEX "product_ingredient_productId_isKeyActive_idx" ON "product_ingredient"("productId", "isKeyActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_ingredient_productId_ingredientId_key" ON "product_ingredient"("productId", "ingredientId");

-- CreateIndex
CREATE INDEX "product_primaryClassification_idx" ON "product"("primaryClassification");

-- CreateIndex
CREATE INDEX "product_routineCategory_idx" ON "product"("routineCategory");

-- AddForeignKey
ALTER TABLE "product_ingredient" ADD CONSTRAINT "product_ingredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredient" ADD CONSTRAINT "product_ingredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
