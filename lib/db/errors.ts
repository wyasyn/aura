const RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "P1001",
  "P1008",
  "P1017",
])

function errorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return ""
  if ("message" in error && typeof error.message === "string") {
    return error.message
  }
  return ""
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined
  if ("code" in error && typeof error.code === "string") {
    return error.code
  }
  return undefined
}

/** Walk error.cause chain (Prisma → Better Auth APIError, etc.). */
export function collectErrorChain(error: unknown, depth = 0): unknown[] {
  const chain: unknown[] = []
  let current: unknown = error
  let level = depth

  while (current && level <= 6) {
    chain.push(current)
    if (current === null || typeof current !== "object") {
      break
    }
    const record = current as Record<string, unknown>
    current = record.cause
    level += 1
  }

  return chain
}

export function isTransientDbError(error: unknown): boolean {
  for (const item of collectErrorChain(error)) {
    const code = errorCode(item)
    if (code && RETRYABLE_CODES.has(code)) {
      return true
    }

    const message = errorMessage(item)
    if (/timeout|timed out|connection|ECONN|can't reach database/i.test(message)) {
      return true
    }
  }

  return false
}

export function isFailedToGetSessionError(error: unknown): boolean {
  const message = errorMessage(error)
  return (
    message.includes("Failed to get session") ||
    message.includes("FAILED_TO_GET_SESSION")
  )
}
