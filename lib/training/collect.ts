import { recordAudit, recordAuditMany } from "@/lib/audit/log"
import { DEIDENT_VERSION, deidentifyScan, findIdentifierLeaks } from "@/lib/training/deidentify"
import { checkEligibility } from "@/lib/training/eligibility"
import { prisma } from "@/lib/db/client"

/**
 * Collects eligible scans into the training set.
 *
 * Eligibility is re-checked here against live consent rather than trusted from
 * any earlier decision, so a patient who revoked between the scan and this run
 * is never collected.
 */

export type CollectionSummary = {
  considered: number
  collected: number
  skipped: Record<string, number>
  /** Records refused because de-identification left something identifying. */
  blockedByLeakCheck: number
}

export async function collectTrainingRecords(options?: {
  limit?: number
  actorId?: string
}): Promise<CollectionSummary> {
  const limit = options?.limit ?? 200

  const candidates = await prisma.scan.findMany({
    where: {
      status: "completed",
      result: { isNot: null },
      // Never re-collect: a record that exists has already been judged, and
      // re-adding it would resurrect one an expert rejected.
      trainingRecord: { is: null },
      user: { profile: { trainingConsent: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      organizationId: true,
      status: true,
      createdAt: true,
      captureMode: true,
      profileSnapshot: true,
      locationSnapshot: true,
      result: {
        select: { overallBand: true, dimensions: true, doshaTyping: true },
      },
      feedback: { select: { rating: true } },
      organization: {
        select: { clinic: { select: { allowTrainingContribution: true } } },
      },
    },
  })

  const summary: CollectionSummary = {
    considered: candidates.length,
    collected: 0,
    skipped: {},
    blockedByLeakCheck: 0,
  }

  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1
  }

  const audits: Parameters<typeof recordAuditMany>[0] = []

  for (const scan of candidates) {
    // A clinic scan whose clinic has no ClinicSettings row cannot have opted
    // in, so it is treated as a refusal rather than as "no clinic".
    const clinicAllows = scan.organizationId
      ? (scan.organization?.clinic?.allowTrainingContribution ?? false)
      : null

    const eligibility = checkEligibility({
      patientConsented: true, // Filtered in the query above.
      clinicAllowsContribution: clinicAllows,
      hasAssessment: Boolean(scan.result),
      scanStatus: scan.status,
    })

    if (!eligibility.eligible) {
      skip(eligibility.reason)
      continue
    }

    const deidentified = deidentifyScan({
      createdAt: scan.createdAt,
      captureMode: scan.captureMode,
      profileSnapshot: scan.profileSnapshot,
      locationSnapshot: scan.locationSnapshot,
      result: scan.result,
      feedback: scan.feedback,
    })

    if (!deidentified.ok) {
      skip(deidentified.reason)
      continue
    }

    // The allowlist should make this impossible. If it fires, the allowlist has
    // a hole, and writing the record anyway would put an identifier into the
    // training set — so the record is dropped and the failure made loud.
    const leaks = findIdentifierLeaks(deidentified.payload)
    if (leaks.length > 0) {
      summary.blockedByLeakCheck += 1
      console.error("[training] De-identification left identifiers; scan skipped", {
        scanId: scan.id,
        leaks,
      })
      continue
    }

    await prisma.trainingRecord.create({
      data: {
        sourceScanId: scan.id,
        sourceUserId: scan.userId,
        organizationId: scan.organizationId,
        payload: deidentified.payload,
        deidentVersion: DEIDENT_VERSION,
        status: "pending_validation",
      },
    })

    audits.push({
      action: "training.record.collected",
      subjectType: "training_record",
      subjectId: scan.id,
      actorId: options?.actorId ?? null,
      organizationId: scan.organizationId,
      metadata: { deidentVersion: DEIDENT_VERSION },
    })
    summary.collected += 1
  }

  await recordAuditMany(audits)
  return summary
}

/**
 * Withdraws every record belonging to a user.
 *
 * Called when consent is revoked. Records are marked withdrawn rather than
 * deleted immediately so the withdrawal itself is auditable; the retention
 * purge removes them afterwards.
 */
export async function withdrawTrainingRecordsForUser(
  userId: string,
  reason: string,
  actor: TrainingActor,
): Promise<number> {
  const result = await prisma.trainingRecord.updateMany({
    where: { sourceUserId: userId, status: { not: "withdrawn" } },
    data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnReason: reason },
  })

  await recordWithdrawal(result.count, reason, actor, {
    subjectId: userId,
    organizationId: null,
  })
  return result.count
}

/** As above, for every patient of a clinic that turns contribution off. */
export async function withdrawTrainingRecordsForClinic(
  organizationId: string,
  reason: string,
  actor: TrainingActor,
): Promise<number> {
  const result = await prisma.trainingRecord.updateMany({
    where: { organizationId, status: { not: "withdrawn" } },
    data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnReason: reason },
  })

  await recordWithdrawal(result.count, reason, actor, {
    subjectId: organizationId,
    organizationId,
  })
  return result.count
}

/** Who asked for the withdrawal. Pass SYSTEM_ACTOR for an unattended purge. */
type TrainingActor = { actorId: string | null; actorRole: string | null }

/**
 * One entry per withdrawal, not per record.
 *
 * A clinic opting out can withdraw thousands of rows at once, and a row each
 * would bury every other event in the viewer. The count and the reason are what
 * a later question actually needs — which records they were is answerable from
 * TrainingRecord.withdrawnAt, and that is the point of marking them withdrawn
 * rather than deleting them.
 *
 * Recorded inside these functions rather than at the call sites so a future
 * caller cannot withdraw records without leaving the trail. Silent when nothing
 * changed: withdrawing zero records is not an event.
 */
async function recordWithdrawal(
  count: number,
  reason: string,
  actor: TrainingActor,
  subject: { subjectId: string; organizationId: string | null },
): Promise<void> {
  if (count === 0) return

  await recordAudit({
    action: "training.record.withdrawn",
    subjectType: "training_record",
    subjectId: subject.subjectId,
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    organizationId: subject.organizationId,
    metadata: { reason, records: count },
  })
}
