"use server"

import { revalidatePath } from "next/cache"

import { recordAudit } from "@/lib/audit/log"
import { requireAdmin } from "@/lib/auth/session"
import { collectTrainingRecords } from "@/lib/training/collect"

/**
 * Sweeps eligible scans into the training set.
 *
 * Run deliberately by an admin rather than automatically on every scan: this
 * decides what a model may learn from, and a person should be the one starting
 * it. Eligibility is re-checked against live consent inside.
 */
export async function runTrainingCollectionAction() {
  const session = await requireAdmin()

  const summary = await collectTrainingRecords({ actorId: session.user.id })

  await recordAudit({
    action: "training.record.collected",
    subjectType: "dataset",
    actorId: session.user.id,
    actorRole: "admin",
    metadata: {
      considered: summary.considered,
      collected: summary.collected,
      skipped: summary.skipped,
      blockedByLeakCheck: summary.blockedByLeakCheck,
    },
  })

  revalidatePath("/admin/training")
  return summary
}
