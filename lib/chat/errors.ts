import { toUserFacingScanError } from "@/lib/scan/errors"

type GeminiErrorPayload = {
  error?: {
    code?: number | string
    message?: string
    status?: string
  }
}

function tryParseJsonError(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith("{")) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as GeminiErrorPayload
    const message = parsed.error?.message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  } catch {
    return null
  }

  return null
}

function isHighDemandMessage(message: string): boolean {
  return (
    /high demand/i.test(message) ||
    /UNAVAILABLE/i.test(message) ||
    /temporarily unavailable/i.test(message) ||
    /overloaded/i.test(message)
  )
}

/** Maps API/Gemini failures to short, user-safe chat copy. */
export function toUserFacingChatError(
  err: unknown,
  status?: number,
): string {
  if (status === 503) {
    return "Reconnecting. Please try again in a few seconds."
  }

  if (status === 429) {
    return "Too many messages. Please wait a moment and try again."
  }

  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : ""

  const fromJson = raw ? tryParseJsonError(raw) : null
  const message = fromJson ?? raw

  if (isHighDemandMessage(message)) {
    return "Our assistant is busy right now. Please try again in a moment."
  }

  if (/Insufficient chat token budget/i.test(message)) {
    return "You've used your advice messages for now. Get more scans to continue."
  }

  if (/Conversation turn limit/i.test(message)) {
    return "This conversation has reached its limit. Start a new scan to continue."
  }

  const friendly = toUserFacingScanError(
    message ? new Error(message) : err instanceof Error ? err : new Error("Chat failed"),
  )

  if (friendly.startsWith("{") || friendly.includes('"error"')) {
    return "Something went wrong. Please try again."
  }

  return friendly
}
