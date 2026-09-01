import { AvailabilityManager } from "@/components/experts/availability-manager"
import { requireExpert } from "@/lib/auth/session"
import { listMyAvailabilitySlots } from "@/lib/experts/availability-queries"
import { prisma } from "@/lib/db/client"

export async function AvailabilityLoader() {
  const session = await requireExpert()
  const profile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: session.user.id },
  })
  const slots = await listMyAvailabilitySlots(profile.id)

  return <AvailabilityManager slots={slots} />
}
