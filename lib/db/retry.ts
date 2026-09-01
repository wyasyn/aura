import { isTransientDbError } from "@/lib/db/errors"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === retries) {
        throw error
      }
      // Back off for Neon cold starts: 600ms, 1.2s, 2.4s, ...
      await sleep(600 * 2 ** attempt)
    }
  }

  throw lastError
}

const WARMUP_RETRIES = 2
const WARMUP_BASE_DELAY_MS = 400

export async function withDbWarmupRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= WARMUP_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === WARMUP_RETRIES) {
        throw error
      }
      await sleep(WARMUP_BASE_DELAY_MS * 2 ** attempt)
    }
  }

  throw lastError
}
