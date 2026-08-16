import { getCatalogContext } from "@/lib/ai/context/catalog"
import {
  getUserScanHistoryContextSafe,
} from "@/lib/ai/context/scan-history-safe"
import { SCAN_ANALYSIS_HISTORY_LIMIT } from "@/lib/ai/context/scan-history"
import { getUserScanContext } from "@/lib/ai/context/user"
import {
  runFullInputGuardrails,
  sanitizeAssistantOutput,
} from "@/lib/ai/guardrails"
import {
  buildAdviceContextText,
  buildAdviceSystemPrompt,
  buildFollowUpContextText,
  buildFollowUpSystemPrompt,
} from "@/lib/ai/prompts/chat"
import { recordAiUsage } from "@/lib/ai/usage/record-usage"
import { analyzeWithGemini } from "@/lib/ai/providers/gemini"
import {
  extractChatRecommendations,
  generateChatReply,
  type ChatRecommendationsPayload,
} from "@/lib/ai/providers/gemini-chat"
import { CHAT_REFUSAL_MESSAGE } from "@/lib/ai/prompts/chat"
import {
  transcribeWithGemini,
  type TranscribeAudioInput,
  type TranscribeAudioResult,
} from "@/lib/ai/providers/gemini-transcribe"
import type {
  AnalyzeSkinInput,
  AnalyzeSkinResult,
  CatalogProductContext,
} from "@/lib/ai/types"
import {
  mapUserClimateToTags,
  rankCatalogByClimateTags,
} from "@/lib/climate/tag-match"
import { parseLocationSnapshot } from "@/lib/climate/snapshot"
import {
  formatRecommendedActivesForPrompt,
} from "@/lib/ingredients/format-actives"
import {
  recommendActivesForUser,
} from "@/lib/ingredients/recommend-actives"
import { prisma } from "@/lib/db/client"
import { getScanModelForTier, getUserScanTier } from "@/lib/models/queries"
import { fromScanResult } from "@/lib/scan/persist"
import { hasSufficientTokenBudget } from "@/lib/chat/token-budget"
import type { ChatHistoryMessage } from "@/lib/ai/providers/gemini-chat"
import type { ChatConversationKind } from "@/generated/prisma/client"

export async function analyzeSkin(
  input: Omit<AnalyzeSkinInput, "catalog" | "userContext" | "scanHistory" | "recommendedActives">,
): Promise<AnalyzeSkinResult> {
  const [catalog, userContext, scanHistory] = await Promise.all([
    getCatalogContext(),
    getUserScanContext(input.userId),
    getUserScanHistoryContextSafe(input.userId, {
      limit: SCAN_ANALYSIS_HISTORY_LIMIT,
    }),
  ])

  if (catalog.length === 0) {
    throw new Error("No active products in catalog")
  }

  const activeClimateTags = mapUserClimateToTags(userContext.location)
  const rankedCatalog = rankCatalogByClimateTags(catalog, activeClimateTags)
  const recommendedActives = await recommendActivesForUser({
    profile: userContext.profile,
    location: userContext.location,
  })

  if (input.model.provider !== "gemini") {
    throw new Error(`Provider ${input.model.provider} is not supported yet`)
  }

  return analyzeWithGemini({
    ...input,
    catalog: rankedCatalog,
    userContext,
    activeClimateTags,
    scanHistory,
    recommendedActives: formatRecommendedActivesForPrompt(recommendedActives),
  })
}

export async function transcribeSpeech(
  input: TranscribeAudioInput,
): Promise<TranscribeAudioResult> {
  return transcribeWithGemini(input)
}

export type ChatAboutSkinInput = {
  userId: string
  kind: ChatConversationKind
  userMessage: string
  history: ChatHistoryMessage[]
  scanId?: string
  image?: {
    mimeType: "image/jpeg" | "image/png" | "image/webp"
    data: Buffer
  }
}

export type ChatAboutSkinResult =
  | {
      allowed: true
      reply: string
      /** Card payload from the extraction call, or null when there are none. */
      recommendations: ChatRecommendationsPayload | null
      /** Ranked catalog used for this reply, for prose link enrichment. */
      catalog: CatalogProductContext[]
      usage: AnalyzeSkinResult["usage"]
      latencyMs: number
    }
  | { allowed: false; reason: string }

export async function chatAboutSkin(
  input: ChatAboutSkinInput,
): Promise<ChatAboutSkinResult> {
  const tier = await getUserScanTier(input.userId)
  const model = await getScanModelForTier(tier)
  if (!model) {
    throw new Error("No active chat model configured")
  }

  const hasScanContext = input.kind === "follow_up" && Boolean(input.scanId)

  const hasImage = Boolean(input.image?.data.byteLength)

  const guardrails = await runFullInputGuardrails(
    input.userMessage,
    model.modelId,
    hasScanContext,
    { hasImage, history: input.history },
  )
  if (guardrails.classifierUsage) {
    await recordAiUsage({
      feature: "chat_guardrail",
      usage: guardrails.classifierUsage.usage,
      userId: input.userId,
      scanId: input.scanId ?? null,
      latencyMs: guardrails.classifierUsage.latencyMs,
    })
  }

  if (!guardrails.allowed) {
    return { allowed: false, reason: guardrails.reason }
  }

  const hasBudget = await hasSufficientTokenBudget(input.userId)
  if (!hasBudget) {
    return { allowed: false, reason: "Insufficient chat token budget" }
  }

  const [catalog, userContext, scanHistory] = await Promise.all([
    getCatalogContext(),
    getUserScanContext(input.userId),
    getUserScanHistoryContextSafe(input.userId, {
      excludeScanId:
        input.kind === "follow_up" && input.scanId ? input.scanId : undefined,
    }),
  ])

  const activeClimateTags = mapUserClimateToTags(userContext.location)
  const rankedCatalog = rankCatalogByClimateTags(catalog, activeClimateTags)

  let systemInstruction: string
  let contextPrefix: string

  if (input.kind === "follow_up" && input.scanId) {
    const scan = await prisma.scan.findFirst({
      where: { id: input.scanId, userId: input.userId },
      include: { result: true },
    })
    if (!scan?.result) {
      return { allowed: false, reason: "Scan not found" }
    }
    const assessment = fromScanResult(scan.result)
    const climateContext = parseLocationSnapshot(scan.locationSnapshot)
    systemInstruction = buildFollowUpSystemPrompt()
    contextPrefix = buildFollowUpContextText(
      userContext,
      rankedCatalog,
      assessment,
      climateContext,
      scanHistory,
      activeClimateTags,
    )
  } else {
    systemInstruction = buildAdviceSystemPrompt(scanHistory.length > 0)
    contextPrefix = buildAdviceContextText(
      userContext,
      rankedCatalog,
      scanHistory,
      activeClimateTags,
    )
  }

  const fullSystem = `${systemInstruction}\n\nContext:\n${contextPrefix}`

  const { text, usage, latencyMs } = await generateChatReply({
    modelId: model.modelId,
    systemInstruction: fullSystem,
    history: input.history,
    userMessage: input.userMessage,
    userImage: input.image,
  })

  const reply = sanitizeAssistantOutput(text)

  // Cards come from a separate constrained call over the prose, rather than
  // from a fenced JSON block the model hand-writes inside its own answer. A
  // refused reply never gets cards.
  let recommendations: ChatRecommendationsPayload | null = null
  if (reply !== CHAT_REFUSAL_MESSAGE) {
    try {
      const extraction = await extractChatRecommendations({
        modelId: model.modelId,
        systemInstruction: fullSystem,
        userMessage: input.userMessage,
        proseReply: reply,
      })

      if (extraction.payload?.hasRecommendations) {
        recommendations = extraction.payload
      }

      await recordAiUsage({
        feature: "chat_recommendations",
        usage: extraction.usage,
        userId: input.userId,
        scanId: input.scanId ?? null,
        latencyMs: extraction.latencyMs,
      })
    } catch (err) {
      // The prose reply is already good. Losing the cards is a degradation,
      // not a failure, so never let this take the reply down with it.
      console.error("[chat] Recommendation extraction failed", err)
    }
  }

  return {
    allowed: true,
    reply,
    recommendations,
    catalog: rankedCatalog,
    usage: {
      provider: model.provider,
      modelId: model.modelId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      reasoningTokens: usage.reasoningTokens,
      totalTokens: usage.totalTokens,
      rawUsage: usage.rawUsage,
    },
    latencyMs,
  }
}
