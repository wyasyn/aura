import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

/**
 * Partner API key issuing and verification.
 *
 * Keys are stored only as a SHA-256 hash, so a database leak cannot hand over
 * working credentials. A plaintext key exists exactly once, at creation, and is
 * unrecoverable afterwards.
 *
 * SHA-256 rather than a password KDF is deliberate: these are 256 bits of
 * output from a CSPRNG, not a human-chosen secret, so there is nothing to brute
 * force and a slow hash would only add latency to every API request.
 */

const KEY_PREFIX = "aur_sk_"
const PREFIX_DISPLAY_LENGTH = KEY_PREFIX.length + 6

export type IssuedApiKey = {
  /** Shown once to the user, never stored. */
  plaintext: string
  hashedKey: string
  keyPrefix: string
}

export function issueApiKey(): IssuedApiKey {
  const plaintext = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`

  return {
    plaintext,
    hashedKey: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(0, PREFIX_DISPLAY_LENGTH),
  }
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex")
}

/**
 * Compares two key hashes without leaking, through timing, how much of a
 * candidate matched.
 */
export function apiKeyHashMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Pulls the key out of an Authorization header, if it is a well-formed bearer. */
export function extractBearerKey(header: string | null): string | null {
  if (!header) return null

  const [scheme, ...rest] = header.trim().split(/\s+/)
  if (scheme.toLowerCase() !== "bearer") return null

  const token = rest.join("")
  if (!token.startsWith(KEY_PREFIX)) return null

  return token
}

export { KEY_PREFIX }
