import { prisma } from "@/lib/db/client"

export async function listAffiliateApplications() {
  return prisma.affiliateProfile.findMany({
    orderBy: [{ status: "asc" }, { appliedAt: "desc" }],
    include: { user: { select: { name: true, email: true } } },
  })
}
