import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { isTenantRequest } from "@/lib/clinics/tenant-request"
import { TENANT_COOKIE } from "@/lib/clinics/tenant-cookie"

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

  // On a clinic's own site, "/" is that clinic's front door rather than
  // Aurora's marketing page, and it stays reachable signed in or out. Rewritten
  // (not redirected) so the visitor keeps seeing the clinic's own address.
  // /clinic-home renders not-found on the platform host, so this is the only
  // way to reach it.
  if (
    pathname === "/" &&
    isTenantRequest({
      host: request.headers.get("host"),
      pinnedTenant: request.cookies.get(TENANT_COOKIE)?.value,
    })
  ) {
    return NextResponse.rewrite(new URL("/clinic-home", request.url))
  }

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
      source: "/expert/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/experts/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/affiliate/:path*",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/clinic/:path*",
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
