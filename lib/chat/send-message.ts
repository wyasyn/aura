import type { ChatConversationKind } from "@/generated/prisma/client"

import { chatAboutSkin } from "@/lib/ai/adapter"
import { recordAiUsage } from "@/lib/ai/usage/record-usage"
import { chatImageToDataUrl } from "@/lib/chat/image"
import {
  appendChatMessages,
  assertConversationTurnLimit,
  countRecentUserMessages,
  getConversationForUser,
  getOrCreateConversation,
  toChatHistory,
} from "@/lib/chat/conversation"
import {
  debitChatTokens,
} from "@/lib/chat/token-budget"
import {
  extractChatRecommendationsFromContent,
  stripJsonFence,
} from "@/lib/chat/extract-recommendations"
import { stripDuplicateRecommendationProse } from "@/lib/chat/format-message-body"
import { buildChatReply } from "@/lib/chat/parse-recommendations"
import { splitChatDisclaimer } from "@/lib/chat/split-disclaimer"
import type { ChatMessageMetadata } from "@/lib/chat/types"
import { prisma } from "@/lib/db/client"
import { CHAT_REFUSAL_MESSAGE } from "@/lib/ai/prompts/chat"
import { CHAT_RATE_LIMIT_PER_MINUTE } from "@/lib/scans/constants"
import { estimateScanProviderCost } from "@/lib/scans/cost"
import { getUsageTotalTokens } from "@/lib/tokens/format-usage"

import type { ChatImageInput } from "@/lib/chat/image"

export type SendChatMessageInput = {
  userId: string
  message: string
  kind: ChatConversationKind
  scanId?: string
  conversationId?: string
  image?: ChatImageInput
}

export type SendChatMessageResult =
  | {
      ok: true
      conversationId: string
      assistantMessage: string
      assistantMetadata: ChatMessageMetadata | null
      blocked: boolean
      estimatedMessagesRemaining: number
    }
  | { ok: false; error: string; status: number }

export async function sendChatMessage(
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> {
  const trimmed = input.message.trim()
  const hasImage = Boolean(input.image?.buffer.byteLength)
  if (!trimmed && !hasImage) {
    return { ok: false, error: "Message or image is required.", status: 400 }
  }

  const userContent = trimmed || "Shared a skin photo for advice."

  if (input.kind === "follow_up") {
    if (!input.scanId) {
      return { ok: false, error: "Scan id is required.", status: 400 }
    }
    const scan = await prisma.scan.findFirst({
      where: {
        id: input.scanId,
        userId: input.userId,
        status: "completed",
      },
      include: { result: true },
    })
    if (!scan?.result) {
      return { ok: false, error: "Scan not found.", status: 404 }
    }
  }

  const recentCount = await countRecentUserMessages(input.userId, 60_000)
  if (recentCount >= CHAT_RATE_LIMIT_PER_MINUTE) {
    return {
      ok: false,
      error: "Too many messages. Please wait a moment.",
      status: 429,
    }
  }

  let conversation: Awaited<ReturnType<typeof getConversationForUser>> | null =
    null

  if (input.conversationId || input.kind === "follow_up") {
    try {
      conversation = await getOrCreateConversation({
        userId: input.userId,
        kind: input.kind,
        scanId: input.scanId,
        conversationId: input.conversationId,
      })
    } catch {
      return { ok: false, error: "Conversation not found.", status: 404 }
    }
  }

  try {
    assertConversationTurnLimit(conversation?.messages.length ?? 0)
  } catch {
    return {
      ok: false,
      error: "This conversation has reached its message limit.",
      status: 400,
    }
  }

  const history = conversation ? toChatHistory(conversation.messages) : []
  const chatResult = await chatAboutSkin({
    userId: input.userId,
    kind: input.kind,
    scanId: input.scanId,
    userMessage: userContent,
    history,
    image: input.image
      ? { mimeType: input.image.mimeType, data: input.image.buffer }
      : undefined,
  })

  if (!chatResult.allowed) {
    if (chatResult.reason === "Insufficient chat token budget") {
      return {
        ok: false,
        error: "Insufficient chat token budget. Purchase more scans to continue.",
        status: 402,
      }
    }

    const saved = await appendChatMessages({
      conversationId: conversation?.id,
      userId: input.userId,
      kind: input.kind,
      userContent,
      userBlocked: true,
      userImage: input.image,
      assistantContent: CHAT_REFUSAL_MESSAGE,
      assistantRole: "system_refusal",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    })

    const budget = await import("@/lib/chat/token-budget").then((m) =>
      m.getTokenBudget(input.userId),
    )

    return {
      ok: true,
      conversationId: saved.conversationId,
      assistantMessage: CHAT_REFUSAL_MESSAGE,
      assistantMetadata: null,
      blocked: true,
      estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
    }
  }

  const parsedReply = await buildChatReply(
    chatResult.reply,
    chatResult.recommendations,
    input.userId,
    chatResult.catalog,
  )
  const totalTokens = getUsageTotalTokens(chatResult.usage)
  const costEstimate = await estimateScanProviderCost(chatResult.usage)

  const saved = await appendChatMessages({
    conversationId: conversation?.id,
    userId: input.userId,
    kind: input.kind,
    userContent,
    userBlocked: false,
    userImage: input.image,
    assistantContent: parsedReply.content,
    assistantRole: "assistant",
    inputTokens: chatResult.usage.inputTokens,
    outputTokens: chatResult.usage.outputTokens,
    cachedTokens: chatResult.usage.cachedTokens,
    reasoningTokens: chatResult.usage.reasoningTokens,
    totalTokens,
    modelId: chatResult.usage.modelId,
    estimatedCostMicros: costEstimate?.costMicros ?? null,
    metadata: parsedReply.metadata,
  })

  await recordAiUsage({
    feature: "chat_reply",
    usage: chatResult.usage,
    userId: input.userId,
    scanId: input.scanId ?? null,
    conversationId: saved.conversationId,
    chatMessageId: saved.assistantMessageId,
    latencyMs: chatResult.latencyMs,
    costMicros: costEstimate?.costMicros ?? null,
    marginMicros: costEstimate?.marginMicros ?? null,
  })

  await debitChatTokens({
    userId: input.userId,
    tokens: totalTokens,
    conversationId: saved.conversationId,
    scanId: input.scanId,
    metadata: {
      modelId: chatResult.usage.modelId,
      inputTokens: chatResult.usage.inputTokens,
      outputTokens: chatResult.usage.outputTokens,
      cachedTokens: chatResult.usage.cachedTokens,
      reasoningTokens: chatResult.usage.reasoningTokens,
    },
  })

  const budget = await import("@/lib/chat/token-budget").then((m) =>
    m.getTokenBudget(input.userId),
  )

  return {
    ok: true,
    conversationId: saved.conversationId,
    assistantMessage: parsedReply.content,
    assistantMetadata: parsedReply.metadata,
    blocked: false,
    estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
  }
}

/**
 * Rows written before recommendations moved into `metadata` still carry the
 * JSON fence and disclaimer inside `content`. Recover them here, once per load,
 * so the client can render `content` and `metadata` as-is.
 */
function recoverLegacyReply(content: string): {
  content: string
  metadata: ChatMessageMetadata | null
} {
  const recommendations = extractChatRecommendationsFromContent(content)
  const { body, consultationNote } = splitChatDisclaimer(
    stripJsonFence(content),
  )

  if (!recommendations && !consultationNote) {
    return { content, metadata: null }
  }

  const metadata: ChatMessageMetadata = { ...(recommendations ?? {}) }
  delete metadata.disclaimer
  if (consultationNote) {
    metadata.consultationNote = consultationNote
  }

  return {
    content: stripDuplicateRecommendationProse(body, metadata),
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  }
}

function mapMessageForClient(m: {
  id: string
  role: string
  content: string
  blocked: boolean
  createdAt: Date
  imageMimeType: string | null
  imageData: Buffer | Uint8Array | null
  metadata: unknown
}) {
  const storedMetadata = (m.metadata as ChatMessageMetadata | null) ?? null
  const isAssistant = m.role === "assistant" || m.role === "system_refusal"
  const recovered =
    isAssistant && !storedMetadata ? recoverLegacyReply(m.content) : null

  return {
    id: m.id,
    role: m.role,
    content: recovered?.content ?? m.content,
    blocked: m.blocked,
    createdAt: m.createdAt.toISOString(),
    imageUrl: m.imageMimeType
      ? chatImageToDataUrl(m.imageMimeType, m.imageData)
      : null,
    metadata: storedMetadata ?? recovered?.metadata ?? null,
  }
}

export async function loadChatConversation(
  conversationId: string,
  userId: string,
) {
  const conversation = await getConversationForUser(conversationId, userId)
  if (!conversation) {
    return null
  }

  const budget = await import("@/lib/chat/token-budget").then((m) =>
    m.getTokenBudget(userId),
  )

  return {
    id: conversation.id,
    kind: conversation.kind,
    scanId: conversation.scanId,
    messages: conversation.messages.map(mapMessageForClient),
    estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
  }
}

export async function loadEmptyAdviceSession(userId: string) {
  const budget = await import("@/lib/chat/token-budget").then((m) =>
    m.getTokenBudget(userId),
  )

  return {
    id: null,
    kind: "advice" as const,
    scanId: null,
    messages: [],
    estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
  }
}

export async function loadAdviceConversation(
  userId: string,
  conversationId?: string,
) {
  if (!conversationId) {
    return loadEmptyAdviceSession(userId)
  }

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, kind: "advice" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  const budget = await import("@/lib/chat/token-budget").then((m) =>
    m.getTokenBudget(userId),
  )

  if (!conversation) {
    return {
      id: null,
      kind: "advice" as const,
      scanId: null,
      messages: [] as {
        id: string
        role: string
        content: string
        blocked: boolean
        createdAt: string
      }[],
      estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
    }
  }

  return {
    id: conversation.id,
    kind: conversation.kind,
    scanId: conversation.scanId,
    messages: conversation.messages.map(mapMessageForClient),
    estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
  }
}

export async function loadFollowUpConversation(scanId: string, userId: string) {
  const conversation = await prisma.chatConversation.findFirst({
    where: { userId, scanId, kind: "follow_up" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  const budget = await import("@/lib/chat/token-budget").then((m) =>
    m.getTokenBudget(userId),
  )

  if (!conversation) {
    return {
      id: null,
      kind: "follow_up" as const,
      scanId,
      messages: [] as {
        id: string
        role: string
        content: string
        blocked: boolean
        createdAt: string
      }[],
      estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
    }
  }

  return {
    id: conversation.id,
    kind: conversation.kind,
    scanId: conversation.scanId,
    messages: conversation.messages.map(mapMessageForClient),
    estimatedMessagesRemaining: budget.estimatedMessagesRemaining,
  }
}
