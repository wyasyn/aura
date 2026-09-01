"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAudit } from "@/lib/audit/log"
import { requireAuthContext } from "@/lib/auth/context"
import { requireClinicManager } from "@/lib/clinics/membership"
import {
  withdrawTrainingRecordsForClinic,
  withdrawTrainingRecordsForUser,
} from "@/lib/training/collect"
import { TRAINING_CONSENT_VERSION } from "@/lib/training/constants"
import { prisma } from "@/lib/db/client"


const consentSchema = z.object({ granted: z.boolean() })

/**
 * A patient's own decision about model training.
 *
 * Revoking withdraws records already collected, not just future ones —
 * otherwise "revoke" would only mean "stop collecting more", which is not what
 * anyone means when they withdraw consent for their health data.
 */
export async function setTrainingConsentAction(input: unknown) {
  const ctx = await requireAuthContext()
  const { granted } = consentSchema.parse(input)

  await prisma.userProfile.update({
    where: { userId: ctx.userId },
    data: {
      trainingConsent: granted,
      trainingConsentAt: new Date(),
      trainingConsentVersion: granted ? TRAINING_CONSENT_VERSION : null,
    },
  })

  let withdrawn = 0
  if (!granted) {
    withdrawn = await withdrawTrainingRecordsForUser(ctx.userId, "consent_revoked", {
      actorId: ctx.userId,
      actorRole: ctx.role,
    })
  }

  await recordAudit({
    action: granted ? "training.consent.granted" : "training.consent.revoked",
    subjectType: "user",
    subjectId: ctx.userId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    metadata: { version: TRAINING_CONSENT_VERSION, withdrawnRecords: withdrawn },
  })

  revalidatePath("/dashboard/privacy")
  return { granted, withdrawn }
}

/**
 * A clinic's decision about whether its patients' scans may be considered.
 *
 * Turning it off withdraws that clinic's records, so a clinic can pull its
 * patients out of the dataset without needing each of them to act.
 */
export async function setClinicTrainingContributionAction(input: unknown) {
  const session = await requireClinicManager()
  const { granted } = consentSchema.parse(input)

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: {
      allowTrainingContribution: granted,
      trainingContributionSetAt: new Date(),
      trainingContributionSetById: session.userId,
    },
  })

  let withdrawn = 0
  if (!granted) {
    withdrawn = await withdrawTrainingRecordsForClinic(session.scope, "clinic_opted_out", {
      actorId: session.userId,
      actorRole: session.role,
    })
  }

  await recordAudit({
    action: granted
      ? "training.clinic_contribution.enabled"
      : "training.clinic_contribution.disabled",
    subjectType: "clinic",
    subjectId: session.tenant.clinicId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.scope,
    metadata: { withdrawnRecords: withdrawn },
  })

  revalidatePath("/clinic/data")
  return { granted, withdrawn }
}
