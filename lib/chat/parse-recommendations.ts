import { enrichProductLinks } from "@/lib/ai/enrich-product-links"
import type { CatalogProductContext } from "@/lib/ai/types"
import { enrichChatProductRecommendations } from "@/lib/products/enrich-recommendations"
import { filterRecommendationsByAllergies } from "@/lib/products/filter-recommendations-by-allergies"
import { prisma } from "@/lib/db/client"
import { stripDuplicateRecommendationProse } from "@/lib/chat/format-message-body"
import { splitChatDisclaimer } from "@/lib/chat/split-disclaimer"
import {
  chatRecommendationsSchema,
  extractJsonFence,
  parseChatRecommendationsJson,
  slugToDisplayName,
  stripJsonFence,
} from "@/lib/chat/extract-recommendations"
import type { ChatMessageMetadata } from "@/lib/chat/types"
import type { NaturalRecommendation } from "@/lib/scan/types"

export type ParsedChatReply = {
  content: string
  metadata: ChatMessageMetadata | null
}

function finalizeChatReply(
  prose: string,
  metadata: ChatMessageMetadata | null,
  catalog: CatalogProductContext[] = [],
): ParsedChatReply {
  const linked = enrichProductLinks(prose, catalog, {
    excludeSlugs: (metadata?.productRecommendations ?? []).map(
      (item) => item.id,
    ),
  })
  const { body, consultationNote } = splitChatDisclaimer(linked)
  if (!consultationNote && !metadata) {
    return { content: body, metadata: null }
  }

  const nextMetadata: ChatMessageMetadata = { ...(metadata ?? {}) }
  delete nextMetadata.disclaimer
  if (consultationNote) {
    nextMetadata.consultationNote = consultationNote
  }

  const displayBody = stripDuplicateRecommendationProse(body, nextMetadata)

  return {
    content: displayBody,
    metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : null,
  }
}

/**
 * Builds card metadata from the structured extraction call, applying allergy
 * filtering and catalog enrichment.
 */
async function buildMetadataFromPayload(
  payload: unknown,
  userId: string,
): Promise<ChatMessageMetadata | null> {
  const parsed = chatRecommendationsSchema.safeParse(payload)
  if (!parsed.success) {
    return null
  }

  const metadata: ChatMessageMetadata = {}

  if (parsed.data.naturalRecommendations?.length) {
    metadata.naturalRecommendations = parsed.data
      .naturalRecommendations as NaturalRecommendation[]
  }

  if (parsed.data.productRecommendations?.length) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { allergies: true },
    })
    const allergySafe = await filterRecommendationsByAllergies(
      parsed.data.productRecommendations.map((item) => ({
        id: item.id,
        name: item.name ?? slugToDisplayName(item.id),
        reason: item.reason,
        applicationTime: item.applicationTime,
        applicationFrequency: item.applicationFrequency,
        imageUrl: null,
        storeUrl: null,
      })),
      profile?.allergies ?? null,
    )
    const enriched = await enrichChatProductRecommendations(allergySafe)
    if (enriched.length > 0) {
      metadata.productRecommendations = enriched
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : null
}

/**
 * Turns a reply plus its structured recommendation payload into the stored
 * message. The reply is prose only, so there is no fence to strip.
 */
export async function buildChatReply(
  reply: string,
  recommendations: unknown | null,
  userId: string,
  catalog: CatalogProductContext[] = [],
): Promise<ParsedChatReply> {
  const metadata = recommendations
    ? await buildMetadataFromPayload(recommendations, userId)
    : null

  return finalizeChatReply(reply.trim(), metadata, catalog)
}

/**
 * Legacy path for messages stored before recommendations moved to their own
 * call, where the payload lived in a fenced JSON block inside the prose.
 * Still used when re-parsing historical rows on load.
 */
export async function parseAndEnrichChatReply(
  rawReply: string,
  userId: string,
  catalog: CatalogProductContext[] = [],
): Promise<ParsedChatReply> {
  const { prose, jsonText, tail } = extractJsonFence(rawReply)
  const combinedProse = [prose, tail].filter(Boolean).join("\n\n")

  if (!jsonText) {
    return finalizeChatReply(combinedProse || rawReply.trim(), null, catalog)
  }

  const parsed = parseChatRecommendationsJson(jsonText)
  if (!parsed) {
    return finalizeChatReply(
      combinedProse || stripJsonFence(rawReply.trim()),
      null,
      catalog,
    )
  }

  const metadata: ChatMessageMetadata = {}

  if (parsed.naturalRecommendations?.length) {
    metadata.naturalRecommendations =
      parsed.naturalRecommendations as NaturalRecommendation[]
  }

  if (parsed.productRecommendations?.length) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { allergies: true },
    })
    const allergySafeRecommendations = await filterRecommendationsByAllergies(
      parsed.productRecommendations,
      profile?.allergies ?? null,
    )
    const enriched = await enrichChatProductRecommendations(
      allergySafeRecommendations,
    )
    if (enriched.length > 0) {
      metadata.productRecommendations = enriched
    }
  }

  if (
    !metadata.naturalRecommendations?.length &&
    !metadata.productRecommendations?.length
  ) {
    return finalizeChatReply(
      combinedProse || stripJsonFence(rawReply.trim()),
      null,
      catalog,
    )
  }

  return finalizeChatReply(combinedProse || prose, metadata, catalog)
}

// Re-export schema for tests or tooling
export { chatRecommendationsSchema }
