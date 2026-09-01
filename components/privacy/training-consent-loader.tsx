import { TrainingConsentCard } from "@/components/privacy/training-consent-card"
import { requireAuthContext } from "@/lib/auth/context"
import { prisma } from "@/lib/db/client"

export async function TrainingConsentLoader() {
  const ctx = await requireAuthContext()

  const profile = await prisma.userProfile.findUnique({
    where: { userId: ctx.userId },
    select: { trainingConsent: true, trainingConsentAt: true },
  })

  return (
    <TrainingConsentCard
      granted={profile?.trainingConsent ?? false}
      decidedAt={profile?.trainingConsentAt ?? null}
    />
  )
}
