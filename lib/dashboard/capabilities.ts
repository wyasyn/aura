import { cache } from "react"

import { normalizeRole } from "@/lib/auth/role"
import { prisma } from "@/lib/db/client"
import type { WorkspaceCapabilities } from "@/lib/dashboard/nav"

/**
 * What a person can actually do, as opposed to the single role string on their
 * account.
 *
 * Roles are one field, but capabilities overlap: an administrator who also
 * consults holds role "admin" and an approved ExpertProfile at the same time.
 * Deriving workspaces from the role alone hid the expert view from exactly the
 * people most likely to need both.
 *
 * Each capability is checked at its source — an approved profile, a real
 * membership — rather than inferred, so holding a role while an application is
 * still pending does not open a workspace.
 */
export const getWorkspaceCapabilities = cache(
  async (userId: string, role: string | null): Promise<WorkspaceCapabilities> => {
    const [expert, affiliate, membership] = await Promise.all([
      prisma.expertProfile.findFirst({
        where: { userId, status: "approved" },
        select: { id: true },
      }),
      prisma.affiliateProfile.findFirst({
        where: { userId, status: "approved" },
        select: { id: true },
      }),
      // Active only. A revoked or suspended membership grants nothing, and the
      // route gate already refuses it — but without this filter the person kept
      // seeing a Clinic workspace in their navigation and only discovered it
      // was gone by clicking. Offering a door that will not open is its own
      // small disclosure about a clinic they no longer belong to.
      prisma.member.findFirst({
        where: { userId, status: "active" },
        select: { id: true },
      }),
    ])

    return {
      isAdmin: normalizeRole(role) === "admin",
      isExpert: Boolean(expert),
      isAffiliate: Boolean(affiliate),
      isClinicMember: Boolean(membership),
    }
  },
)
