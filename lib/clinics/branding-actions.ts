"use server"

import { revalidatePath } from "next/cache"

import { requireClinicManager } from "@/lib/clinics/membership"
import { clinicBrandingSchema } from "@/lib/clinics/schemas"
import { prisma } from "@/lib/db/client"

export async function updateClinicBrandingAction(input: unknown) {
  const session = await requireClinicManager()
  const data = clinicBrandingSchema.parse(input)

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: {
      displayName: data.displayName,
      logoUrl: data.logoUrl ?? null,
      primaryColor: data.primaryColor ?? null,
      accentColor: data.accentColor ?? null,
      supportEmail: data.supportEmail ?? null,
    },
  })

  revalidatePath("/clinic/branding")
  // The patient-facing front door reads the same record.
  revalidatePath("/clinic-home")
}
