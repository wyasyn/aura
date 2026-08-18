import { prisma } from "@/lib/db/client"

export async function listExpertApplications() {
  return prisma.expertProfile.findMany({
    orderBy: [{ status: "asc" }, { appliedAt: "desc" }],
    include: { user: { select: { name: true, email: true } } },
  })
}
