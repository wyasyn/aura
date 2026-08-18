"use server"

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

  await prisma.organization.delete({ where: { id: clinic.organizationId } })

  revalidatePath("/admin/clinics")
  return { subdomain: clinic.subdomain, detachedScans }
}
