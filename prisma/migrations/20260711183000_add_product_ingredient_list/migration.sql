-- AlterTable
ALTER TABLE "product" ADD COLUMN "ingredientList" TEXT[] DEFAULT ARRAY[]::TEXT[];
