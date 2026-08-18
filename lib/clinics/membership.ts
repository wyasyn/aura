import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { getAuthContext } from "@/lib/auth/context"
import { resolveTenant, type TenantContext } from "@/lib/clinics/tenant"
import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"

declare const TENANT_SCOPE: unique symbol

/**
 * An organization id that has been proven to belong to the caller.
 *
 * Tenant isolation rests on every tenant-scoped query filtering by
 * organizationId, which is easy to get right once and easy to lose later.
 * Queries in lib/clinics/queries.ts take this branded type instead of a plain
 * string, and the only way to obtain one is to resolve a membership below — so
 * a future caller cannot pass an id straight from a route param or form field
 * and have it compile.
 */
export type TenantScope = string & { readonly [TENANT_SCOPE]: true }

/**
 * Mints a scope from an id whose membership has just been verified. Deliberately
 * not exported: minting elsewhere would defeat the guarantee.
 */
function asTenantScope(organizationId: string): TenantScope {
  return organizationId as TenantScope
}

export type ClinicRole = "owner" | "admin" | "member"

const MANAGE_ROLES = new Set<ClinicRole>(["owner", "admin"])

export function canManageClinic(role: ClinicRole): boolean {
  return MANAGE_ROLES.has(role)
}

function normalizeRole(raw: string): ClinicRole {
  return raw === "owner" || raw === "admin" ? raw : "member"
}

export type ClinicSession = {
  tenant: TenantContext
  userId: string
  role: ClinicRole
  /** Pass this to tenant-scoped queries; see TenantScope. */
  scope: TenantScope
}

export type ClinicSessionResult =
  | { kind: "ok"; session: ClinicSession }
  /** Signed in, but not a member of the clinic that owns this subdomain. */
  | { kind: "not_a_member" }
  | { kind: "no_tenant" }
  | { kind: "guest" }
  | { kind: "db_unavailable" }

/**
 * Resolves the current user's membership of the clinic that owns this
 * subdomain.
 *
 * Deliberately uses resolveTenant rather than getServableTenant: a clinic whose
 * subscription has lapsed still needs its own admins to be able to sign in and
 * fix billing. Entitlement gates the patient-facing site, not the staff area.
 */
export const resolveClinicSession = cache(async (): Promise<ClinicSessionResult> => {
  const tenantResult = await resolveTenant()

  if (tenantResult.kind === "db_unavailable") return { kind: "db_unavailable" }
  if (tenantResult.kind !== "tenant") return { kind: "no_tenant" }

  const auth = await getAuthContext()
  if (!auth) return { kind: "guest" }

  let member
  try {
    member = await withDbRetry(() =>
      prisma.member.findUnique({
        where: {
          userId_organizationId: {
            userId: auth.userId,
            organizationId: tenantResult.tenant.organizationId,
          },
        },
        select: { role: true },
      }),
    )
  } catch (error) {
    console.error("resolveClinicSession: membership lookup failed", error)
    return { kind: "db_unavailable" }
  }

  // A platform admin is not automatically a member. Tenant data stays behind
  // tenant membership so a support login can't silently read patient records.
  if (!member) return { kind: "not_a_member" }

  return {
    kind: "ok",
    session: {
      tenant: tenantResult.tenant,
      userId: auth.userId,
      role: normalizeRole(member.role),
      // Minted only here, once a Member row for this user and organization has
      // actually been found.
      scope: asTenantScope(tenantResult.tenant.organizationId),
    },
  }
})

/** For server actions and loaders that must have a clinic member. */
export async function requireClinicMember(): Promise<ClinicSession> {
  const result = await resolveClinicSession()

  switch (result.kind) {
    case "ok":
      return result.session
    case "guest":
      redirect("/login")
    // Both are "there is nothing here for you" from the caller's point of view,
    // and saying which would leak whether a given subdomain exists.
    case "no_tenant":
    case "not_a_member":
      notFound()
    case "db_unavailable":
      throw new Error("The database is unavailable. Please try again.")
  }
}

/** For actions only owners and clinic admins may perform. */
export async function requireClinicManager(): Promise<ClinicSession> {
  const session = await requireClinicMember()
  if (!canManageClinic(session.role)) {
    throw new Error("Only clinic owners and admins can do that.")
  }
  return session
}
