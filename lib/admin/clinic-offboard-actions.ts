"use server"

import { recordAuditIn } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { deletionBlockedReason, previewClinicDeletion } from "@/lib/admin/clinic-offboard"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"

const previewSchema = z.object({ clinicId: z.string().trim().min(1) })

export async function previewClinicDeletionAction(input: unknown) {
  await requireAdmin()
  const { clinicId } = previewSchema.parse(input)

  const preview = await previewClinicDeletion(clinicId)
  if (!preview) throw new Error("Clinic not found")
  return preview
}

const deleteSchema = z.object({
  clinicId: z.string().trim().min(1),
  /** Must match the clinic's subdomain exactly; see below. */
  confirmSubdomain: z.string().trim().min(1),
})

/**
 * Permanently removes a tenant.
 *
 * Deleting the Organization cascades to its members, invitations and clinic
 * settings. Patient scans are deliberately *not* deleted: Scan.organizationId
 * is SetNull, so each scan detaches from the clinic and stays with the patient
 * who took it. A clinic ending its contract is not a reason to destroy the
 * medical records of people who still hold accounts and reports.
 */
export async function deleteClinicAction(input: unknown) {
  const session = await requireAdmin()
  const { clinicId, confirmSubdomain } = deleteSchema.parse(input)

  const clinic = await prisma.clinicSettings.findUnique({
    where: { id: clinicId },
    select: {
      id: true,
      subdomain: true,
      displayName: true,
      organizationId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
    },
  })
  if (!clinic) throw new Error("Clinic not found")

  // Typing the subdomain is the guard against deleting the wrong tenant from a
  // list where every row's delete button looks identical.
  if (confirmSubdomain !== clinic.subdomain) {
    throw new Error(
      `Type the subdomain "${clinic.subdomain}" exactly to confirm deletion.`,
    )
  }

  const blocked = deletionBlockedReason(clinic)
  if (blocked) throw new Error(blocked)

  const detachedScans = await prisma.scan.count({
    where: { organizationId: clinic.organizationId },
  })

  // Recorded before the rows disappear, so there is a trace of who removed
  // which tenant and how much patient data was detached.
  console.warn(
    `[admin] Clinic deleted: ${clinic.displayName} (${clinic.subdomain}) by ${session.user.id}. ${detachedScans} scan(s) detached and retained for their patients.`,
  )

  // Tier A. The record and the deletion commit together or not at all.
  //
  // Previously the audit was written first and best-effort, so a failed write
  // logged a line to stderr and let the deletion proceed anyway — the exact
  // shape of the incident this entry exists to prevent. Now a failure to
  // record rolls the transaction back and the tenant is still there.
  //
  // Safe to write inside the transaction that deletes the organization because
  // AuditLog holds organizationId as a plain column with no foreign key, so the
  // cascade cannot reach the row that describes the cascade.
  await prisma.$transaction(async (tx) => {
    await recordAuditIn(tx, {
      action: "tenant.deleted",
      subjectType: "clinic",
      subjectId: clinic.organizationId,
      actorId: session.user.id,
      actorRole: "admin",
      organizationId: clinic.organizationId,
      requestId: await currentRequestId(),
      metadata: {
        subdomain: clinic.subdomain,
        displayName: clinic.displayName,
        detachedScans,
      },
    })

    await tx.organization.delete({ where: { id: clinic.organizationId } })
  })

  revalidatePath("/admin/clinics")
  return { subdomain: clinic.subdomain, detachedScans }
}
