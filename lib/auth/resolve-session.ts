import { cache } from "react"
import { headers } from "next/headers"

import { auth } from "@/lib/auth/server"
import { hasAuthSessionCookie } from "@/lib/auth/session-cookie"
import type { Session } from "@/lib/auth/server"
import { isFailedToGetSessionError, isTransientDbError } from "@/lib/db/errors"
import { withDbRetry } from "@/lib/db/retry"

export type SessionResolveResult =
  | { status: "ok"; session: Session }
  | { status: "none" }
  | { status: "db_unavailable" }

const SESSION_LOOKUP_RETRIES = 2

export const resolveSession = cache(async (): Promise<SessionResolveResult> => {
  const requestHeaders = await headers()
  const hadSessionCookie = hasAuthSessionCookie(requestHeaders)

  try {
    const session = await withDbRetry(
      () =>
        auth.api.getSession({
          headers: requestHeaders,
        }),
      SESSION_LOOKUP_RETRIES,
    )

    if (session) {
      return { status: "ok", session }
    }

    return { status: "none" }
  } catch (error) {
    if (
      hadSessionCookie &&
      (isTransientDbError(error) || isFailedToGetSessionError(error))
    ) {
      console.warn(
        "[auth] session lookup failed after retries; treating as db_unavailable",
        error instanceof Error ? error.message : error,
      )
      return { status: "db_unavailable" }
    }

    if (isTransientDbError(error) || isFailedToGetSessionError(error)) {
      return { status: "none" }
    }

    throw error
  }
})
