import {
  ValidationQueue,
  type ValidationCandidate,
} from "@/components/training/validation-queue"
import { requireExpert } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

export async function ValidationQueueLoader() {
  await requireExpert()

  const records = await prisma.trainingRecord.findMany({
    where: { status: "pending_validation" },
    orderBy: { createdAt: "asc" },
    take: 50,
    // Only the id and the de-identified payload. The source scan and user are
    // deliberately not selected: a reviewer has no need for them, and not
    // fetching them means they cannot reach the browser by accident.
    select: { id: true, payload: true },
  })

  return (
    <ValidationQueue
      candidates={records.map((record) => ({
        id: record.id,
        payload: record.payload as ValidationCandidate["payload"],
      }))}
    />
  )
}
