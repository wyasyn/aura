import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

import { FeedbackTable } from "./feedback-table"

export async function FeedbackTableLoader() {
  await requireAdmin()

  const feedback = await prisma.scanFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: { name: true, email: true },
      },
      scan: {
        include: {
          result: {
            select: { overallBand: true },
          },
        },
      },
    },
  })

  const rows = feedback.map((entry) => ({
    id: entry.id,
    scanId: entry.scanId,
    createdAt: entry.createdAt.toISOString(),
    rating: entry.rating,
    message: entry.message,
    userName: entry.user.name,
    userEmail: entry.user.email,
    overallBand: entry.scan.result?.overallBand ?? null,
  }))

  return <FeedbackTable rows={rows} />
}
