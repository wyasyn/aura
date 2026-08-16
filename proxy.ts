import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

/**
 * Next.js 16+: use `proxy.ts` (not `middleware.ts`).
 * Keep this thin — cookie presence only. Session, onboarding, and role
 * checks live in route layouts via lib/auth/context.ts.
 *
 * @see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 */
/**
 * Routes that only make sense signed out. The landing page is a pitch for an
 * account the visitor already has, so signed-in users go straight to the
 * dashboard. Help, privacy and terms stay reachable either way.
 */
const SIGNED_OUT_ONLY = new Set(["/"])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionCookie = getSessionCookie(request)

  if (SIGNED_OUT_ONLY.has(pathname)) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Unlike the protected routes below, "/" runs on prefetches too. Skipping
    // them would let the router cache a prefetched landing page for a signed-in
    // user, and the click would then never reach this redirect.
    "/",
    {
      source: "/dashboard/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/reports/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/chats/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/settings/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/admin/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/onboarding",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/onboarding/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/scan",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/scan/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
}
