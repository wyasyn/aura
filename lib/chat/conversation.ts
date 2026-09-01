import type { ChatConversationKind, ChatMessageRole } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

import type { ChatHistoryMessage } from "@/lib/ai/providers/gemini-chat"
import type { ChatImageInput } from "@/lib/chat/image"
import type { ChatMessageMetadata } from "@/lib/chat/types"
import { prisma } from "@/lib/db/client"
import { MAX_CHAT_TURNS_PER_CONVERSATION } from "@/lib/scans/constants"

export type ChatMessageRecord = {
  id: string
  role: ChatMessageRole
  content: string
  blocked: boolean
  createdAt: Date
  imageMimeType?: string | null
  imageData?: Buffer | Uint8Array | null
}

export async function listAdviceConversations(
  userId: string,
  page = 1,
  pageSize = 20,
) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const skip = (safePage - 1) * pageSize
  const assistantReplyRoles: ChatMessageRole[] = ["assistant", "system_refusal"]
  const where = {
    userId,
    kind: "advice" as const,
    messages: {
      some: {
        role: { in: assistantReplyRoles },
      },
    },
  }

  await prisma.chatConversation.deleteMany({
    where: {
      userId,
      kind: "advice",
      messages: {
        none: {
          role: { in: assistantReplyRoles },
        },
      },
    },
  })

  const [conversations, totalCount] = await Promise.all([
    prisma.chatConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        messages: {
          where: { role: "user" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.chatConversation.count({ where }),
  ])

  return {
    conversations,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    page: safePage,
  }
}

export async function getConversationForUser(
  conversationId: string,
  userId: string,
) {
  return prisma.chatConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  })
}

export async function getOrCreateConversation(input: {
  userId: string
  kind: ChatConversationKind
  scanId?: string
  conversationId?: string
}) {
  if (input.conversationId) {
    const existing = await getConversationForUser(
      input.conversationId,
      input.userId,
    )
    if (!existing) {
      throw new Error("Conversation not found")
    }
    if (input.scanId && existing.scanId !== input.scanId) {
      throw new Error("Conversation does not match scan")
    }
    if (existing.kind !== input.kind) {
      throw new Error("Conversation kind mismatch")
    }
    return existing
  }

  if (input.kind === "follow_up" && input.scanId) {
    const existing = await prisma.chatConversation.findFirst({
      where: {
        userId: input.userId,
        scanId: input.scanId,
        kind: "follow_up",
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    })
    if (existing) {
      return existing
    }

    return prisma.chatConversation.create({
      data: {
        userId: input.userId,
        scanId: input.scanId,
        kind: "follow_up",
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    })
  }

  throw new Error("Conversation not found")
}

export function toChatHistory(
  messages: ChatMessageRecord[],
): ChatHistoryMessage[] {
  return messages
    .filter((m) => !m.blocked && m.role !== "system_refusal")
    .map((m) => {
      const entry: ChatHistoryMessage = {
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }
      if (m.imageMimeType && m.imageData && m.imageData.byteLength > 0) {
        entry.image = {
          mimeType: m.imageMimeType as ChatImageInput["mimeType"],
          data: Buffer.from(m.imageData),
        }
      }
      return entry
    })
}

export async function countRecentUserMessages(
  userId: string,
  windowMs: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMs)
  return prisma.chatMessage.count({
    where: {
      conversation: { userId },
      role: "user",
      createdAt: { gte: since },
    },
  })
}

export function assertConversationTurnLimit(messageCount: number) {
  const userTurns = Math.ceil(messageCount / 2)
  if (userTurns >= MAX_CHAT_TURNS_PER_CONVERSATION) {
    throw new Error("Conversation turn limit reached")
  }
}

export async function appendChatMessages(input: {
  conversationId?: string
  userId?: string
  kind?: ChatConversationKind
  userContent: string
  userBlocked: boolean
  userImage?: ChatImageInput
  assistantContent: string
  assistantRole: ChatMessageRole
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  reasoningTokens?: number | null
  totalTokens: number
  modelId?: string | null
  estimatedCostMicros?: number | null
  metadata?: ChatMessageMetadata | null
}): Promise<{ conversationId: string; assistantMessageId: string }> {
  const assistantData = {
    role: input.assistantRole,
    content: input.assistantContent,
    blocked: false,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachedTokens: input.cachedTokens ?? 0,
    reasoningTokens: input.reasoningTokens ?? null,
    totalTokens: input.totalTokens,
    modelId: input.modelId ?? null,
    estimatedCostMicros: input.estimatedCostMicros ?? null,
    metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
  }

  if (input.conversationId) {
    const [, assistant] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId: input.conversationId,
          role: "user",
          content: input.userContent,
          blocked: input.userBlocked,
          imageMimeType: input.userImage?.mimeType,
          imageData: input.userImage?.buffer
            ? new Uint8Array(input.userImage.buffer)
            : undefined,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: input.conversationId,
          ...assistantData,
        },
      }),
      prisma.chatConversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      }),
    ])
    return {
      conversationId: input.conversationId,
      assistantMessageId: assistant.id,
    }
  }

  if (!input.userId || input.kind !== "advice") {
    throw new Error("Conversation id is required")
  }

  const userId = input.userId

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.chatConversation.create({
      data: {
        userId,
        kind: "advice",
      },
    })

    await tx.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: input.userContent,
        blocked: input.userBlocked,
        imageMimeType: input.userImage?.mimeType,
        imageData: input.userImage?.buffer
          ? new Uint8Array(input.userImage.buffer)
          : undefined,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    })

    const assistant = await tx.chatMessage.create({
      data: {
        conversationId: conversation.id,
        ...assistantData,
      },
    })

    return {
      conversationId: conversation.id,
      assistantMessageId: assistant.id,
    }
  })
}
