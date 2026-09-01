import { NextResponse } from "next/server"

import {
  TENANT_COOKIE,
  TENANT_COOKIE_OPTIONS,
  hostBasedTenancyConfigured,
} from "@/lib/clinics/tenant-cookie"
import { prisma } from "@/lib/db/client"

type RouteContext = {
  params: Promise<{ subdomain: string }>
}

/**
 * Pins the browser to a clinic, for deployments with no wildcard domain.
 * See lib/clinics/tenant-cookie.ts for why this exists.
 *
 * "exit" is reserved as the way back to the platform, which is why a clinic
 * can never take that subdomain (see RESERVED_SUBDOMAINS).
 */
/**
 * Where to land after pinning. Only same-site paths are honoured: an absolute
 * URL, or a protocol-relative one, would turn this into an open redirect that
 * borrows the clinic's name to send people elsewhere.
 */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/"
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/"
  return raw
}

export async function GET(request: Request, context: RouteContext) {
  const { subdomain } = await context.params
  const url = new URL(request.url)
  const origin = url.origin
  const next = safeNextPath(url.searchParams.get("next"))

  if (subdomain === "exit") {
    const response = NextResponse.redirect(new URL("/", origin))
    response.cookies.delete(TENANT_COOKIE)
    return response
  }

  // With a wildcard domain configured, subdomains are the real mechanism and
  // this shortcut would only add a second, weaker way to select a tenant.
  if (hostBasedTenancyConfigured()) {
    return NextResponse.redirect(new URL("/", origin))
  }

  const clinic = await prisma.clinicSettings.findUnique({
    where: { subdomain: subdomain.toLowerCase() },
    select: { id: true },
  })

  if (!clinic) {
    return NextResponse.json({ error: "Unknown clinic" }, { status: 404 })
  }

  const response = NextResponse.redirect(new URL(next, origin))
  response.cookies.set(TENANT_COOKIE, subdomain.toLowerCase(), TENANT_COOKIE_OPTIONS)
  return response
}
