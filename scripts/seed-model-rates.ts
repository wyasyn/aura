/**
 * Seed AI model rate rows for usage-based pricing.
 * Run after migrations: npm run db:seed-rates
 *
 * Rates are micro-USD per 1M tokens, taken from the published Gemini API paid
 * tier (https://ai.google.dev/gemini-api/docs/pricing), verified 2026-08-13.
 * Scan prompts sit far below 200k tokens, so the short-context rate applies.
 *
 * Tier ladder: smallest model on Starter, latest Flash on Plus, strongest model
 * on Pro. Pro also owns the live-scan model. Inactive rows stay in the table so
 * historical AiUsage rows can still be costed.
 */
import "dotenv/config"

import type { ScanTier } from "../generated/prisma/client"
import { prisma } from "../lib/db/client"
import { withDbRetry } from "../lib/db/retry"

type ModelSeed = {
  modelId: string
  displayName: string
  inputMicrosPer1M: number
  outputMicrosPer1M: number
  cachedInputMicrosPer1M: number
  isActive: boolean
  isScanDefault: boolean
  supportsVision: boolean
  supportsLive: boolean
  assignedTier: ScanTier | null
  thinkingLevel: string | null
}

const MODELS: ModelSeed[] = [
  // ── Active tier models ────────────────────────────────────────────────
  {
    // Starter: smallest current vision model. $0.30 / $2.50 / $0.03
    modelId: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash-Lite",
    inputMicrosPer1M: 300_000,
    outputMicrosPer1M: 2_500_000,
    cachedInputMicrosPer1M: 30_000,
    isActive: true,
    isScanDefault: true,
    supportsVision: true,
    supportsLive: false,
    assignedTier: "starter",
    thinkingLevel: "low",
  },
  {
    // Plus: latest Flash, cheaper output than 3.5 Flash. $1.50 / $7.50 / $0.15
    modelId: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    inputMicrosPer1M: 1_500_000,
    outputMicrosPer1M: 7_500_000,
    cachedInputMicrosPer1M: 150_000,
    isActive: true,
    isScanDefault: false,
    supportsVision: true,
    supportsLive: false,
    assignedTier: "plus",
    thinkingLevel: "medium",
  },
  {
    // Pro still: strongest available model. $2.00 / $12.00 / $0.20 under 200k
    modelId: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro",
    inputMicrosPer1M: 2_000_000,
    outputMicrosPer1M: 12_000_000,
    cachedInputMicrosPer1M: 200_000,
    isActive: true,
    isScanDefault: false,
    supportsVision: true,
    supportsLive: false,
    assignedTier: "pro",
    thinkingLevel: "high",
  },
  {
    // Pro live: image/video input $1.00, text output $4.50. No context caching.
    modelId: "gemini-3.1-flash-live-preview",
    displayName: "Gemini 3.1 Flash Live",
    inputMicrosPer1M: 1_000_000,
    outputMicrosPer1M: 4_500_000,
    cachedInputMicrosPer1M: 0,
    isActive: true,
    isScanDefault: false,
    supportsVision: true,
    supportsLive: true,
    assignedTier: "pro",
    thinkingLevel: null,
  },

  // ── Retired, kept so past usage can still be costed ───────────────────
  {
    modelId: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    inputMicrosPer1M: 1_500_000,
    outputMicrosPer1M: 9_000_000,
    cachedInputMicrosPer1M: 150_000,
    isActive: false,
    isScanDefault: false,
    supportsVision: true,
    supportsLive: false,
    assignedTier: null,
    thinkingLevel: "medium",
  },
  {
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    inputMicrosPer1M: 300_000,
    outputMicrosPer1M: 2_500_000,
    cachedInputMicrosPer1M: 30_000,
    isActive: false,
    isScanDefault: false,
    supportsVision: true,
    supportsLive: false,
    assignedTier: null,
    thinkingLevel: "low",
  },
  {
    modelId: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash-Lite",
    inputMicrosPer1M: 100_000,
    outputMicrosPer1M: 400_000,
    cachedInputMicrosPer1M: 10_000,
    isActive: false,
    isScanDefault: false,
    supportsVision: true,
    supportsLive: false,
    assignedTier: null,
    thinkingLevel: null,
  },
]

/** Models that no longer exist in the Gemini API and were never used. */
const REMOVED_MODEL_IDS = ["gemini-3.5-pro", "gemini-omni-flash-preview"]

async function upsertModel(model: ModelSeed) {
  return withDbRetry(
    () =>
      prisma.aiModelRate.upsert({
        where: {
          provider_modelId: {
            provider: "gemini",
            modelId: model.modelId,
          },
        },
        create: {
          provider: "gemini",
          ...model,
        },
        update: {
          displayName: model.displayName,
          inputMicrosPer1M: model.inputMicrosPer1M,
          outputMicrosPer1M: model.outputMicrosPer1M,
          cachedInputMicrosPer1M: model.cachedInputMicrosPer1M,
          isActive: model.isActive,
          isScanDefault: model.isScanDefault,
          supportsVision: model.supportsVision,
          supportsLive: model.supportsLive,
          assignedTier: model.assignedTier,
          thinkingLevel: model.thinkingLevel,
        },
      }),
    5,
  )
}

async function main() {
  // Clear tier slots once, so reassigning a tier cannot trip the unique index.
  await withDbRetry(
    () => prisma.aiModelRate.updateMany({ data: { assignedTier: null } }),
    5,
  )

  for (const model of MODELS) {
    await upsertModel(model)
  }

  const removed = await withDbRetry(() =>
    prisma.aiModelRate.deleteMany({
      where: { provider: "gemini", modelId: { in: REMOVED_MODEL_IDS } },
    }),
  )

  console.log(
    `Seeded ${MODELS.length} Gemini model rates, removed ${removed.count} stale rows`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
