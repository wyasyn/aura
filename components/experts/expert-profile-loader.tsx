import { notFound } from "next/navigation"

import { ExpertProfileView } from "@/components/experts/expert-profile-view"
import { requireSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { getExpertProfileDetail } from "@/lib/experts/marketplace-queries"
import { getPaymentCurrency, isSimulatedProvider } from "@/lib/payments"

export async function ExpertProfileLoader({ expertId }: { expertId: string }) {
  const session = await requireSession()
  const [detail, billingProfile] = await Promise.all([
    getExpertProfileDetail(expertId),
    prisma.billingProfile.findUnique({ where: { userId: session.user.id } }),
  ])

  if (!detail) {
    notFound()
  }

  return (
    <ExpertProfileView
      expert={detail.profile}
      openSlots={detail.openSlots}
      hasBillingProfile={Boolean(billingProfile)}
      isSimulated={isSimulatedProvider()}
      currency={getPaymentCurrency()}
    />
  )
}
