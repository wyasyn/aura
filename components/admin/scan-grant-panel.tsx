import { prisma } from "@/lib/db/client"
import type { ScanTier } from "@/generated/prisma/client"
import { listActiveScanPacks } from "@/lib/scans/packs"

import { ScanGrantForm } from "./scan-grant-form"

export type ScanGrantUser = {
  id: string
  name: string | null
  email: string
  remaining: number
  scanTier: ScanTier
}

export async function ScanGrantPanel() {
  const [users, packs] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        scanTier: true,
        scanBalance: { select: { remaining: true } },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 200,
    }),
    listActiveScanPacks(),
  ])

  const grantUsers: ScanGrantUser[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    remaining: user.scanBalance?.remaining ?? 0,
    scanTier: user.scanTier,
  }))

  return <ScanGrantForm users={grantUsers} packs={packs} />
}
