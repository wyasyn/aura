"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  generateVerificationToken,
  validateCustomDomain,
  verifyDomainOwnership,
} from "@/lib/clinics/custom-domain"
import { requireClinicManager } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

const domainSchema = z.object({ domain: z.string().trim().min(1).max(253) })

function revalidateDomain() {
  revalidatePath("/clinic/domain")
}

/**
 * Claims a domain for this clinic. Stored unverified with a fresh token; the
 * clinic proves ownership separately before we serve anything on it.
 */
export async function setClinicCustomDomainAction(input: unknown) {
  const session = await requireClinicManager()
  const parsed = domainSchema.parse(input)

  const validation = validateCustomDomain(parsed.domain)
  if (!validation.ok) throw new Error(validation.error)
  const { domain } = validation

  // Unique in the schema, but checked here so the clinic gets a sentence rather
  // than a constraint violation. Says only that it is taken — naming the clinic
  // holding it would leak who our customers are.
  const taken = await prisma.clinicSettings.findFirst({
    where: { customDomain: domain, NOT: { id: session.tenant.clinicId } },
    select: { id: true },
  })
  if (taken) {
    throw new Error("That domain is already in use.")
  }

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: {
      customDomain: domain,
      customDomainToken: generateVerificationToken(),
      // Re-verification is required whenever the domain changes.
      customDomainVerifiedAt: null,
    },
  })

  revalidateDomain()
  return { domain }
}

/** Runs the real DNS lookup and marks the domain verified when it matches. */
export async function verifyClinicCustomDomainAction() {
  const session = await requireClinicManager()

  const clinic = await prisma.clinicSettings.findUniqueOrThrow({
    where: { id: session.tenant.clinicId },
    select: { customDomain: true, customDomainToken: true },
  })

  if (!clinic.customDomain || !clinic.customDomainToken) {
    throw new Error("Add a domain first.")
  }

  const result = await verifyDomainOwnership(
    clinic.customDomain,
    clinic.customDomainToken,
  )
  if (!result.verified) {
    throw new Error(result.reason)
  }

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: { customDomainVerifiedAt: new Date() },
  })

  revalidateDomain()
  return { verified: true as const, domain: clinic.customDomain }
}

/**
 * Releases the domain. The clinic stays reachable on its subdomain, which is
 * why this is safe to offer without a confirmation step.
 */
export async function removeClinicCustomDomainAction() {
  const session = await requireClinicManager()

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: {
      customDomain: null,
      customDomainToken: null,
      customDomainVerifiedAt: null,
    },
  })

  revalidateDomain()
}
