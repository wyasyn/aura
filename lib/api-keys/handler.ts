import { NextResponse } from "next/server"

import { authenticateApiRequest, type ApiCaller } from "@/lib/api-keys/authenticate"
import { checkRateLimit, rateLimitHeaders } from "@/lib/api-keys/rate-limit"

/**
 * Wraps a partner API route with authentication and rate limiting, so every
 * endpoint gets the same treatment rather than each remembering to apply it.
 */
export function withPartnerApi(
  handler: (caller: ApiCaller, request: Request) => Promise<NextResponse>,
) {
  return async (request: Request): Promise<NextResponse> => {
    const auth = await authenticateApiRequest(request)
    if (!auth.ok) return auth.response

    const limit = checkRateLimit(auth.caller.apiKeyId)
    const headers = rateLimitHeaders(limit)

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Too many requests. Try again shortly.",
        },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
          },
        },
      )
    }

    try {
      const response = await handler(auth.caller, request)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    } catch (error) {
      // Partner-facing: never surface an internal message or stack.
      console.error("[api] Partner request failed", error)
      return NextResponse.json(
        { error: "internal_error", message: "Something went wrong." },
        { status: 500, headers },
      )
    }
  }
}

/** Clamps a caller-supplied page size to something the database can serve. */
export function parseLimit(request: Request, fallback = 50, max = 200): number {
  const raw = new URL(request.url).searchParams.get("limit")
  if (!raw) return fallback

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}
