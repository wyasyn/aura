import { z } from "zod"

import { resolveStoreUrl } from "@/lib/products/store-url"
import type { ChatMessageMetadata } from "@/lib/chat/types"
import type { NaturalRecommendation, ProductRecommendation } from "@/lib/scan/types"

const APPLICATION_TIME = z.enum([
  "morning",
  "evening",
  "anytime",
  "morning_and_evening",
])

const APPLICATION_FREQUENCY = z.enum([
  "once_daily",
  "twice_daily",
  "as_needed",
  "few_times_weekly",
  "weekly",
])

function normalizeApplicationTime(value: unknown): unknown {
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase()
  if (normalized === "night" || normalized === "nighttime" || normalized === "pm") {
    return "evening"
  }
  if (normalized === "day" || normalized === "am") {
    return "morning"
  }
  return value
}

function normalizeApplicationFrequency(value: unknown): unknown {
  if (typeof value !== "string") return value
  const key = value.trim().toLowerCase().replace(/[\s-]/g, "")
  const aliases: Record<string, z.infer<typeof APPLICATION_FREQUENCY>> = {
    daily: "once_daily",
    oncedaily: "once_daily",
    twicedaily: "twice_daily",
    asneeded: "as_needed",
    weeklyonce: "weekly",
    threetimesweekly: "few_times_weekly",
    "3timesweekly": "few_times_weekly",
    threexweekly: "few_times_weekly",
    fewtimesweekly: "few_times_weekly",
  }
  return aliases[key] ?? value
}

const naturalRecommendationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  applicationTime: z.preprocess(
    normalizeApplicationTime,
    APPLICATION_TIME.optional(),
  ),
  applicationFrequency: z.preprocess(
    normalizeApplicationFrequency,
    APPLICATION_FREQUENCY.optional(),
  ),
})

const productRecommendationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  reason: z.string().min(1),
  applicationTime: z.preprocess(
    normalizeApplicationTime,
    APPLICATION_TIME.optional(),
  ),
  applicationFrequency: z.preprocess(
    normalizeApplicationFrequency,
    APPLICATION_FREQUENCY.optional(),
  ),
})

export const chatRecommendationsSchema = z.object({
  naturalRecommendations: z.array(naturalRecommendationSchema).optional(),
  productRecommendations: z.array(productRecommendationSchema).optional(),
})

export const CHAT_JSON_FENCE_OPEN = /```(?:json)?\s*/i

const CHAT_JSON_KEYS =
  /"(?:naturalRecommendations|productRecommendations)"/

/** Extract a balanced `{...}` object starting at `startIndex`. */
export function extractBalancedJson(
  text: string,
  startIndex: number,
): string | null {
  if (text[startIndex] !== "{") {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\" && inString) {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return text.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

function findRecommendationJsonFence(rawReply: string): {
  fenceStart: number
  fenceEnd: number
  jsonText: string
} | null {
  const openMatch = rawReply.match(CHAT_JSON_FENCE_OPEN)
  if (!openMatch || openMatch.index === undefined) {
    return null
  }

  const contentStart = openMatch.index + openMatch[0].length
  const braceStart = rawReply.indexOf("{", contentStart)
  if (braceStart === -1) {
    return null
  }

  const jsonText = extractBalancedJson(rawReply, braceStart)
  if (!jsonText || !CHAT_JSON_KEYS.test(jsonText)) {
    return null
  }

  const closeFenceIndex = rawReply.indexOf("```", braceStart + jsonText.length)
  if (closeFenceIndex === -1) {
    return null
  }

  return {
    fenceStart: openMatch.index,
    fenceEnd: closeFenceIndex + 3,
    jsonText,
  }
}

export const CHAT_JSON_FENCE_PATTERN =
  /```(?:json)?\s*(\{[\s\S]*?"(?:naturalRecommendations|productRecommendations)"[\s\S]*?\})\s*```/i

export function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toDisplayProduct(
  item: z.infer<typeof productRecommendationSchema>,
): ProductRecommendation {
  return {
    id: item.id,
    name: item.name ?? slugToDisplayName(item.id),
    reason: item.reason,
    applicationTime: item.applicationTime,
    applicationFrequency: item.applicationFrequency,
    imageUrl: null,
    storeUrl: resolveStoreUrl({ slug: item.id }),
  }
}

export function parseChatRecommendationsJson(
  jsonText: string,
): ChatMessageMetadata | null {
  try {
    const parsed = chatRecommendationsSchema.parse(JSON.parse(jsonText))
    const metadata: ChatMessageMetadata = {}

    if (parsed.naturalRecommendations?.length) {
      metadata.naturalRecommendations =
        parsed.naturalRecommendations as NaturalRecommendation[]
    }

    if (parsed.productRecommendations?.length) {
      metadata.productRecommendations = parsed.productRecommendations.map(
        toDisplayProduct,
      )
    }

    return Object.keys(metadata).length > 0 ? metadata : null
  } catch {
    return null
  }
}

export function extractChatRecommendationsFromContent(
  content: string,
): ChatMessageMetadata | null {
  const { jsonText } = extractJsonFence(content)
  if (!jsonText) {
    return null
  }

  return parseChatRecommendationsJson(jsonText)
}

export function extractJsonFence(rawReply: string): {
  prose: string
  jsonText: string | null
  tail: string
} {
  const fence = findRecommendationJsonFence(rawReply)
  if (!fence) {
    return { prose: rawReply.trim(), jsonText: null, tail: "" }
  }

  return {
    prose: rawReply.slice(0, fence.fenceStart).trim(),
    jsonText: fence.jsonText,
    tail: rawReply.slice(fence.fenceEnd).trim(),
  }
}

export function stripJsonFence(rawReply: string): string {
  const fence = findRecommendationJsonFence(rawReply)
  if (!fence) {
    return rawReply.trim()
  }

  return `${rawReply.slice(0, fence.fenceStart)}${rawReply.slice(fence.fenceEnd)}`.trim()
}
