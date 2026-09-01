import { createHash, timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

/**
 * Authorises a scheduled job request.
 *
 * One shared check for both cron routes, so the two cannot drift into
 * disagreeing about what counts as authorised.
 *
 * Two header forms are accepted, and both carry the same secret:
 *
 *   Authorization: Bearer <CRON_SECRET>   — what Vercel Cron sends
 *   X-Cron-Secret: <CRON_SECRET>          — for schedulers that reserve
 *                                           Authorization for their own signing
 *
 * Supporting the second costs nothing and means an EventBridge API destination
 * using its own auth on Authorization still has a way to present the secret.
 * Neither form is weaker than the other; both are the same comparison.
 */

/**
 * Constant-time string comparison.
 *
 * timingSafeEqual requires equal lengths and throws otherwise, which would
 * leak length through an exception and defeat the point. Hashing both sides
 * first makes them the same size whatever came in, so the comparison is over
 * two 32-byte digests and reveals nothing about the candidate — not its
 * content, not how much of it matched, not how long it was.
 */
function secretsMatch(candidate: string, secret: string): boolean {
  const a = createHash("sha256").update(candidate, "utf8").digest()
  const b = createHash("sha256").update(secret, "utf8").digest()
  return timingSafeEqual(a, b)
}

/** The secret a request is presenting, from either accepted header. */
export function presentedCronSecret(headers: Headers): string | null {
  const authorization = headers.get("authorization")
  if (authorization) {
    const [scheme, ...rest] = authorization.trim().split(/\s+/)
    if (scheme?.toLowerCase() === "bearer" && rest.length > 0) {
      return rest.join(" ")
    }
  }

  const direct = headers.get("x-cron-secret")
  if (direct?.trim()) return direct.trim()

  return null
}

export type CronAuthorization =
  | { ok: true }
  | { ok: false; response: NextResponse }

function unauthorized(): CronAuthorization {
  return {
    ok: false,
    // Deliberately identical whether the secret was absent, malformed or
    // wrong. A caller learns only that it is not authorised.
    response: NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    ),
  }
}

export function authorizeCronRequest(request: Request): CronAuthorization {
  const secret = process.env.CRON_SECRET

  // No configured secret means the job cannot be authorised at all. Refusing
  // is the only safe reading: the alternative — treating "unset" as "open" —
  // turns a missing environment variable into a public endpoint that deletes
  // audit rows.
  if (!secret) return unauthorized()

  const presented = presentedCronSecret(request.headers)
  if (!presented) return unauthorized()

  return secretsMatch(presented, secret) ? { ok: true } : unauthorized()
}
