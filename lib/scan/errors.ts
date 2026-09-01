const FRIENDLY_BY_MESSAGE: Record<string, string> = {
  "No active products in catalog":
    "The product catalog isn't ready yet. An admin needs to seed products first.",
  "No active scan model configured":
    "Scan analysis isn't configured yet. Ask an admin to set an active vision model.",
  "GEMINI_API_KEY is not configured":
    "Skin analysis is temporarily unavailable. Try again later.",
  "No scans remaining": "You don't have any scans left. Upgrade to continue.",
  "Invalid scan image": "That image couldn't be processed. Try another photo.",
  "Could not save scan result":
    "Your analysis completed but couldn't be saved. Please try again.",
}

function isInternalErrorMessage(message: string): boolean {
  return (
    /prisma/i.test(message) ||
    /findMany|findFirst|invocation/i.test(message) ||
    /__TURBOPACK__/i.test(message) ||
    /Invalid `/.test(message)
  )
}

function isLocationDbError(message: string): boolean {
  return /userLocation/i.test(message)
}

export function toUserFacingScanError(err: unknown): string {
  if (typeof err === "string" && err.trim()) {
    return toUserFacingScanError(new Error(err))
  }

  if (err instanceof Error) {
    const known = FRIENDLY_BY_MESSAGE[err.message]
    if (known) return known

    const code =
      "code" in err && typeof err.code === "string" ? err.code : undefined
    if (code && /ETIMEDOUT|ECONNRESET|ECONNREFUSED|P1001|P1008|P1017/.test(code)) {
      return "The server is temporarily unavailable. Please try again in a moment."
    }

    if (/timeout|timed out|ETIMEDOUT|ECONN/i.test(err.message)) {
      return "The server is temporarily unavailable. Please try again in a moment."
    }

    if (isInternalErrorMessage(err.message)) {
      if (isLocationDbError(err.message)) {
        return "We couldn't load your location context. Your scan can still run — try again."
      }
      return "We couldn't load the product catalog. Check your database setup and try again."
    }

    if (/GEMINI|Gemini|genai/i.test(err.message)) {
      return "The AI service is temporarily unavailable. Please try again."
    }

    if (/Empty response|Invalid JSON/i.test(err.message)) {
      return "The AI returned an unexpected response. Please try again."
    }

    if (/invalid product recommendations/i.test(err.message)) {
      return "We couldn't match products to your scan. Please try again."
    }

    if (err.message.length <= 120 && !isInternalErrorMessage(err.message)) {
      return err.message
    }
  }

  return "Skin analysis failed. Please try again."
}

export function logScanAnalysisError(phase: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(`[scan] ${phase}: ${err.message}`)
    return
  }
  console.error(`[scan] ${phase}:`, err)
}
