-- CreateEnum
CREATE TYPE "SkinDosha" AS ENUM ('vata', 'pitta', 'kapha', 'balanced');

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN "skinDosha" "SkinDosha";

-- AlterTable
ALTER TABLE "scan_result" ADD COLUMN "doshaTyping" JSONB;
