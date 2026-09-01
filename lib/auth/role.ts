import { cache } from "react"

import { prisma } from "@/lib/db/client"
import { withDbRetry } from "@/lib/db/retry"
import type { AppRole } from "@/lib/dashboard/nav"

const VALID_ROLES = new Set<AppRole>([
  "user",
  "admin",
  "expert",
  "company_admin",
])

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role && VALID_ROLES.has(role as AppRole)) {
    return role as AppRole
  }
  return "user"
}

export const getUserRole = cache(async (userId: string): Promise<AppRole> => {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  )
  return normalizeRole(user?.role)
})

export function canSeeAdminNav(role: AppRole): boolean {
  return role === "admin"
}
