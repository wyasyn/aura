import { cache } from "react"
import { headers } from "next/headers"

import { extractSubdomain } from "@/lib/clinics/subdomain"
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
export const resolveTenant = cache(async (): Promise<TenantResolveResult> => {
  const subdomain = await getTenantSubdomain()
  if (!subdomain) {
    return { kind: "platform" }
  }

  let clinic
  try {
    clinic = await withDbRetry(() =>
      prisma.clinicSettings.findUnique({
        where: { subdomain },
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
  } catch (error) {
    // Mirrors the auth resolver: a transient database failure degrades to a
    // "try again" surface instead of a hard crash or, worse, being mistaken
    // for an unknown tenant.
    console.error("resolveTenant: clinic lookup failed", error)
    return { kind: "db_unavailable" }
  }

  if (!clinic) {
    return { kind: "unknown_subdomain", subdomain }
  }

  return {
    kind: "tenant",
    tenant: {
      clinicId: clinic.id,
      organizationId: clinic.organizationId,
      organizationName: clinic.organization.name,
      subdomain: clinic.subdomain,
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
