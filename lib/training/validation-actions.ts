"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAudit } from "@/lib/audit/log"
import { requireExpert } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

const verdictSchema = z.object({
  recordId: z.string().trim().min(1),
  verdict: z.enum(["confirmed", "corrected", "rejected"]),
  correctedBand: z
    .enum(["minimal", "mild", "moderate", "elevated", "not_assessed"])
    .optional(),
  notes: z.string().trim().max(1000).optional(),
})

/**
 * Records a qualified expert's judgement on one candidate example.
 *
 * This is the gate that keeps the dataset from teaching the model its own
 * mistakes: nothing reaches an export until a human with the relevant
 * qualification has confirmed or corrected it.
 */
export async function validateTrainingRecordAction(input: unknown) {
  const session = await requireExpert()
  const parsed = verdictSchema.parse(input)

  // Approved experts only. Someone whose application is pending or was rejected
  // holds the role but has not been vetted, and their judgement must not decide
  // what a model learns.
  const expert = await prisma.expertProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true },
  })
  if (!expert || expert.status !== "approved") {
    throw new Error("Only approved experts can validate training records.")
  }

  if (parsed.verdict === "corrected" && !parsed.correctedBand) {
    throw new Error("Give the correct band when marking an assessment corrected.")
  }

  const record = await prisma.trainingRecord.findUnique({
    where: { id: parsed.recordId },
    select: { id: true, status: true, organizationId: true },
  })
  if (!record) throw new Error("Record not found")

  // A withdrawn record is out of the dataset for consent or retention reasons.
  // Reviewing it would put it back in scope, so it is refused outright.
  if (record.status === "withdrawn") {
    throw new Error("This record has been withdrawn and cannot be validated.")
  }

  const nextStatus = parsed.verdict === "rejected" ? "rejected" : "validated"

  await prisma.$transaction([
    prisma.trainingValidation.upsert({
      where: { trainingRecordId: record.id },
      create: {
        trainingRecordId: record.id,
        expertId: expert.id,
        verdict: parsed.verdict,
        correctedBand: parsed.correctedBand ?? null,
        notes: parsed.notes ?? null,
      },
      update: {
        expertId: expert.id,
        verdict: parsed.verdict,
        correctedBand: parsed.correctedBand ?? null,
        notes: parsed.notes ?? null,
      },
    }),
    prisma.trainingRecord.update({
      where: { id: record.id },
      data: { status: nextStatus },
    }),
  ])

  await recordAudit({
    action: "training.record.validated",
    subjectType: "training_record",
    subjectId: record.id,
    actorId: session.user.id,
    actorRole: "expert",
    organizationId: record.organizationId,
    metadata: {
      verdict: parsed.verdict,
      correctedBand: parsed.correctedBand ?? null,
      expertProfileId: expert.id,
    },
  })

  revalidatePath("/expert/validation")
  return { status: nextStatus }
}
