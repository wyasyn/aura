import { NextResponse } from "next/server"

import { resolveSession } from "@/lib/auth/resolve-session"
import type { Session } from "@/lib/auth/server"

type ApiSessionSuccess = { session: Session }
type ApiSessionFailure = { response: NextResponse }

export type ApiSessionResult = ApiSessionSuccess | ApiSessionFailure

export async function requireApiSession(): Promise<ApiSessionResult> {
  const result = await resolveSession()

  if (result.status === "ok") {
    return { session: result.session }
  }

  if (result.status === "db_unavailable") {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error:
            "Reconnecting to the database. Please try again in a few seconds.",
          code: "DB_UNAVAILABLE",
        },
        {
          status: 503,
          headers: { "Retry-After": "5" },
        },
      ),
    }
  }

  return {
    response: NextResponse.json(
      { ok: false, error: "Please sign in to continue." },
      { status: 401 },
    ),
  }
}
