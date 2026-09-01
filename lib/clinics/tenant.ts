import { cache } from "react"
import { cookies, headers } from "next/headers"

import { extractSubdomain, normalizeHostname } from "@/lib/clinics/subdomain"
import { TENANT_COOKIE } from "@/lib/clinics/tenant-cookie"
import { pinnedTenantCandidate } from "@/lib/clinics/tenant-request"
import {
  resolveClinicAccess,
  resolveScanQuota,
  type ClinicAccess,
  type QuotaState,
} from "@/lib/clinics/subscription"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

export type TenantBranding = {
  displayName: string
  logoUrl: string | null
  primaryColor: string | null
  accentColor: string | null
  supportEmail: string | null
}

export type TenantPlan = {
  id: string
  name: string
  seatLimit: number
  monthlyScanQuota: number
}

export type TenantContext = {
  clinicId: string
  organizationId: string
  organizationName: string
  subdomain: string
  /** Verified domain the clinic is also served on, if any. */
  customDomain: string | null
  branding: TenantBranding
  access: ClinicAccess
  quota: QuotaState
  plan: TenantPlan | null
  subscriptionStatus: string
  currentPeriodEnd: Date | null
}

export type TenantResolveResult =
  /** Request is for the platform itself, not a clinic. */
  | { kind: "platform" }
  | { kind: "tenant"; tenant: TenantContext }
  /** Host looks like a tenant, but no clinic owns that subdomain. */
  | { kind: "unknown_subdomain"; subdomain: string }
  | { kind: "db_unavailable" }

/**
 * The clinic subdomain for this request, read straight from the Host header.
 *
 * Deliberately not dependent on proxy.ts injecting a header: the proxy matcher
 * is an explicit allowlist of paths, so anything relying on an injected header
 * would silently lose its branding on any route outside that list.
 */
export const getTenantSubdomain = cache(async (): Promise<string | null> => {
  const headerList = await headers()
  return extractSubdomain(headerList.get("host"))
})

/** Single per-request tenant loader. Read-only, so it is safe in render paths. */
/** The ways a clinic row can be addressed. */
type ClinicWhere = { subdomain: string } | { customDomain: string }

export const resolveTenant = cache(async (): Promise<TenantResolveResult> => {
  const headerList = await headers()
  const host = normalizeHostname(headerList.get("host"))
  const subdomain = await getTenantSubdomain()

  // A clinic may be reached on its own subdomain, on its own verified domain,
  // or — where the host can carry no tenant at all — by the pin cookie.
  //
  // Tried in that order, first match wins, so the host always beats the
  // cookie and the cookie can never select a tenant on a host that already
  // names one.
  //
  // The cookie used to sit behind `if (!where)`, a condition that never held:
  // `host` is present on every real request, so `where` was always at least
  // `{ customDomain: host }` and the pinned branch was unreachable. The
  // fallback that exists for deployments without a wildcard domain — which is
  // every *.vercel.app — therefore never ran at all.
  // The "a cookie may never override the host" rule lives in tenant-request.ts
  // and is asked for here rather than restated, so this resolver and the two
  // database-free callers cannot drift apart about when a pin counts.
  const pinnedCandidate = pinnedTenantCandidate({
    host: headerList.get("host"),
    pinnedTenant: (await cookies()).get(TENANT_COOKIE)?.value ?? null,
  })

  type Match = "subdomain" | "customDomain" | "pin"
  const candidates: { by: Match; where: ClinicWhere }[] = []

  if (subdomain) {
    candidates.push({ by: "subdomain", where: { subdomain } })
  } else {
    if (host) candidates.push({ by: "customDomain", where: { customDomain: host } })
    if (pinnedCandidate) {
      candidates.push({ by: "pin", where: { subdomain: pinnedCandidate } })
    }
  }

  if (candidates.length === 0) {
    return { kind: "platform" }
  }

  let clinic: Awaited<ReturnType<typeof findClinic>> = null
  let matchedBy: Match | null = null

  async function findClinic(where: ClinicWhere) {
    return withDbRetry(() =>
      prisma.clinicSettings.findUnique({
        where,
        include: {
          organization: { select: { name: true } },
          plan: {
            select: {
              id: true,
              name: true,
              seatLimit: true,
              monthlyScanQuota: true,
            },
          },
        },
      }),
    )
  }

  try {
    for (const candidate of candidates) {
      clinic = await findClinic(candidate.where)
      if (clinic) {
        matchedBy = candidate.by
        break
      }
    }
  } catch (error) {
    // Mirrors the auth resolver: a transient database failure degrades to a
    // "try again" surface instead of a hard crash or, worse, being mistaken
    // for an unknown tenant.
    console.error("resolveTenant: clinic lookup failed", error)
    return { kind: "db_unavailable" }
  }

  if (!clinic) {
    // Reached on a host that is neither a known subdomain nor a known domain.
    return { kind: "unknown_subdomain", subdomain: subdomain ?? pinnedCandidate ?? host ?? "" }
  }

  // Matched by domain, but that domain has not been proven yet. Treat it as
  // unknown rather than serving the clinic on a host it may not control.
  //
  // Keyed to how the clinic was actually matched. Testing `!subdomain` would
  // also catch a pin-cookie match, and a pinned clinic has no custom domain to
  // verify — it would be rejected for failing a check that does not apply.
  if (matchedBy === "customDomain" && !clinic.customDomainVerifiedAt) {
    return { kind: "unknown_subdomain", subdomain: host ?? "" }
  }

  return {
    kind: "tenant",
    tenant: {
      clinicId: clinic.id,
      organizationId: clinic.organizationId,
      organizationName: clinic.organization.name,
      subdomain: clinic.subdomain,
      customDomain: clinic.customDomainVerifiedAt ? clinic.customDomain : null,
      branding: {
        displayName: clinic.displayName,
        logoUrl: clinic.logoUrl,
        primaryColor: clinic.primaryColor,
        accentColor: clinic.accentColor,
        supportEmail: clinic.supportEmail,
      },
      access: resolveClinicAccess({
        status: clinic.status,
        subscriptionStatus: clinic.subscriptionStatus,
      }),
      quota: resolveScanQuota({
        periodScanCount: clinic.periodScanCount,
        plan: clinic.plan,
      }),
      plan: clinic.plan,
      subscriptionStatus: clinic.subscriptionStatus,
      currentPeriodEnd: clinic.currentPeriodEnd,
    },
  }
})

/**
 * The tenant for this request when it is servable, else null. Use this for
 * branding decisions: a suspended or unpaid clinic falls back to unbranded
 * platform rendering rather than presenting itself as live.
 */
export const getServableTenant = cache(async (): Promise<TenantContext | null> => {
  const result = await resolveTenant()
  if (result.kind !== "tenant") return null
  return result.tenant.access.ok ? result.tenant : null
})

/**
 * The clinic owning this host, regardless of whether its subscription entitles
 * it to serve patients.
 *
 * Used by the login gate, which must keep working for a lapsed clinic: its
 * staff still need to sign in to fix billing, so entitlement is checked later,
 * per route, not at the door.
 */
export async function getTenantSubdomainOrganizationId(): Promise<string | null> {
  const result = await resolveTenant()
  return result.kind === "tenant" ? result.tenant.organizationId : null
}

/** The organization id to stamp on records created during this request. */
export async function getTenantOrganizationId(): Promise<string | null> {
  const tenant = await getServableTenant()
  return tenant?.organizationId ?? null
}

/**
 * As above, but null instead of throwing when there is no request context to
 * read a Host header from — a scan replayed from a queue or a script belongs to
 * no tenant, and that is a correct answer rather than a failure.
 */
export async function getTenantOrganizationIdSafe(): Promise<string | null> {
  try {
    return await getTenantOrganizationId()
  } catch {
    return null
  }
}
