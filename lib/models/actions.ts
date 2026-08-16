"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { ACTIVE_SCAN_MODEL_TAG } from "@/lib/models/queries"
import {
  assignModelTierSchema,
  modelRateFormSchema,
} from "@/lib/models/schemas"

const MODELS_PATH = "/admin/models"

function revalidateModelCaches() {
  revalidatePath(MODELS_PATH)
  revalidatePath("/admin/tokens")
  revalidatePath("/admin/usage")
  revalidateTag(ACTIVE_SCAN_MODEL_TAG, "max")
}

export async function createModelRateAction(input: unknown) {
  await requireAdmin()
  const data = modelRateFormSchema.parse(input)

  const model = await prisma.aiModelRate.create({
    data: {
      provider: data.provider,
      modelId: data.modelId,
      displayName: data.displayName || null,
      inputMicrosPer1M: data.inputMicrosPer1M,
      outputMicrosPer1M: data.outputMicrosPer1M,
      cachedInputMicrosPer1M: data.cachedInputMicrosPer1M,
      isActive: data.isActive,
      supportsVision: data.supportsVision,
      supportsLive: data.supportsLive,
      thinkingLevel: data.thinkingLevel ?? null,
    },
  })

  revalidateModelCaches()
  return model
}

export async function updateModelRateAction(id: string, input: unknown) {
  await requireAdmin()
  const data = modelRateFormSchema.parse(input)

  const model = await prisma.aiModelRate.update({
    where: { id },
    data: {
      provider: data.provider,
      modelId: data.modelId,
      displayName: data.displayName || null,
      inputMicrosPer1M: data.inputMicrosPer1M,
      outputMicrosPer1M: data.outputMicrosPer1M,
      cachedInputMicrosPer1M: data.cachedInputMicrosPer1M,
      isActive: data.isActive,
      supportsVision: data.supportsVision,
      supportsLive: data.supportsLive,
      thinkingLevel: data.thinkingLevel ?? null,
    },
  })

  revalidateModelCaches()
  return model
}

export async function assignModelToTierAction(
  modelRateId: string,
  input: unknown,
) {
  await requireAdmin()
  const { tier } = assignModelTierSchema.parse(input)

  const target = await prisma.aiModelRate.findUnique({
    where: { id: modelRateId },
  })
  if (!target) {
    throw new Error("Model not found")
  }
  if (!target.isActive) {
    throw new Error("Activate the model before assigning a tier")
  }

  if (tier === "pro") {
    if (!target.supportsLive) {
      throw new Error("Pro tier requires a Live API model (supportsLive)")
    }
  } else if (tier !== null) {
    if (!target.supportsVision) {
      throw new Error("Starter and Thinking tiers require a vision-capable model")
    }
    if (target.supportsLive) {
      throw new Error("Live models can only be assigned to the Pro tier")
    }
  }

  await prisma.$transaction(async (tx) => {
    if (tier !== null) {
      await tx.aiModelRate.updateMany({
        where: { assignedTier: tier },
        data: { assignedTier: null },
      })
    }

    await tx.aiModelRate.update({
      where: { id: modelRateId },
      data: {
        assignedTier: tier,
        isScanDefault: tier === "starter",
      },
    })
  })

  revalidateModelCaches()
}

/** @deprecated Use assignModelToTierAction */
export async function setActiveScanModelAction(id: string) {
  await assignModelToTierAction(id, { tier: "starter" })
}
