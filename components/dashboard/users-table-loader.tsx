import { headers } from "next/headers"

import { UsersTable } from "@/components/admin/users-table"
import { auth } from "@/lib/auth/server"
import { prisma } from "@/lib/db/client"

export async function UsersTableLoader() {
  const usersResult = await auth.api.listUsers({
    query: { limit: 100 },
    headers: await headers(),
  })

  const authUsers = usersResult?.users ?? []
  const userIds = authUsers.map((user) => user.id)

  const scanTiers = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, scanTier: true },
      })
    : []

  const tierByUserId = new Map(scanTiers.map((row) => [row.id, row.scanTier]))

  const initialUsers = authUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    banned: user.banned,
    scanTier: tierByUserId.get(user.id) ?? "starter",
  }))

  return <UsersTable initialUsers={initialUsers} />
}
