import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { getAuthContext } from "@/lib/auth/context"
import { resolveTenant, type TenantContext } from "@/lib/clinics/tenant"
import type { MembershipStatus } from "@/generated/prisma/client"
import {
  permissionsForTenantRole,
  type TenantPermission,
} from "@/lib/clinics/permissions"
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

/**
 * The resolved operating context for one request inside one tenant.
 *
 * Identity, tenant, membership, tenant role and permissions together — the
 * single thing a tenant-aware module needs, so no module resolves any of it
 * again for itself. Named ClinicSession for continuity with its existing
 * callers; getTenantContext() is the platform-facing name.
 */
export type ClinicSession = {
  tenant: TenantContext
  userId: string
  /** The Member row proving this user belongs here. */
  membershipId: string
  role: ClinicRole
  /** Lifecycle state of the membership. Only `active` ever reaches a caller. */
  status: MembershipStatus
  /** Platform role, carried for display and kept distinct from the tenant role. */
  globalRole: string | null
  /** Derived from the tenant role; ask through can(), not by comparing roles. */
  permissions: readonly TenantPermission[]
  /** Pass this to tenant-scoped queries; see TenantScope. */
  scope: TenantScope
}

export type ClinicSessionResult =
  | { kind: "ok"; session: ClinicSession }
  /** Signed in, but not a member of the clinic that owns this subdomain. */
  | { kind: "not_a_member" }
  /** A membership exists but is suspended or revoked, so it grants nothing. */
  | { kind: "membership_inactive"; status: MembershipStatus }
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
        select: { id: true, role: true, status: true },
      }),
    )
  } catch (error) {
    console.error("resolveClinicSession: membership lookup failed", error)
    return { kind: "db_unavailable" }
  }

  // A platform admin is not automatically a member. Tenant data stays behind
  // tenant membership so a support login can't silently read patient records.
  if (!member) return { kind: "not_a_member" }

  // A suspended or revoked membership is not a membership. Kept distinct from
  // not_a_member here so the caller can tell them apart; every current caller
  // treats both as no access.
  if (member.status !== "active") {
    return { kind: "membership_inactive", status: member.status }
  }

  const role = normalizeRole(member.role)

  return {
    kind: "ok",
    session: {
      tenant: tenantResult.tenant,
      userId: auth.userId,
      membershipId: member.id,
      role,
      status: member.status,
      globalRole: auth.role ?? null,
      permissions: permissionsForTenantRole(member.role),
      // Minted only here, once an active Member row for this user and
      // organization has actually been found.
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
    case "membership_inactive":
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

/**
 * The canonical tenant context resolver.
 *
 * resolveClinicSession is the original name and stays as-is for its existing
 * callers; this is the name the rest of the platform should use. One resolver,
 * not two — renaming outright would churn every /clinic consumer for no
 * behavioural gain.
 */
export const getTenantContext = resolveClinicSession

/** For callers that must have an active membership in the current tenant. */
export const requireTenantContext = requireClinicMember

/**
 * Permission helpers live in ./permissions, which has no database import so
 * the matrix can be tested on its own. Re-exported here because a tenant
 * context is what callers hold when they ask.
 */
export { can, requirePermission } from "@/lib/clinics/permissions"
