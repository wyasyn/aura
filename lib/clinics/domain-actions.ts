"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { recordAudit, recordAuditIn, recordDenied } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import {
  generateVerificationToken,
  validateCustomDomain,
  verifyDomainOwnership,
} from "@/lib/clinics/custom-domain"
import { requireClinicManager } from "@/lib/clinics/membership"
import { prisma } from "@/lib/db/client"

/**
 * A custom domain decides which hosts serve a tenant, so every transition is
 * audited. The verification token is deliberately absent from the metadata: it
 * is the secret that proves ownership, and an audit log is read by more people
 * than are allowed to claim a domain.
 */

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
    // Recorded: repeated attempts on a domain held by another clinic are worth
    // being able to see, and the caller is told only that it is taken.
    await recordDenied({
      action: "tenant.domain_claimed",
      subjectType: "clinic",
      subjectId: session.tenant.clinicId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { domain, reason: "already_claimed" },
    })
    throw new Error("That domain is already in use.")
  }

  // Read before the write: update returns the row as it is afterwards, which
  // would record the new domain as the one it replaced.
  const previous = await prisma.clinicSettings.findUnique({
    where: { id: session.tenant.clinicId },
    select: { customDomain: true },
  })

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: {
      customDomain: domain,
      customDomainToken: generateVerificationToken(),
      // Re-verification is required whenever the domain changes.
      customDomainVerifiedAt: null,
    },
  })

  await recordAudit({
    action: "tenant.domain_claimed",
    subjectType: "clinic",
    subjectId: session.tenant.clinicId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { domain, replaced: previous?.customDomain ?? null },
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
    // A failed proof of ownership is the interesting one: it is what a clinic
    // reaching for a domain it does not control looks like.
    await recordDenied({
      action: "tenant.domain_verified",
      subjectType: "clinic",
      subjectId: session.tenant.clinicId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { domain: clinic.customDomain, reason: "dns_proof_failed" },
    })
    throw new Error(result.reason)
  }

  await prisma.clinicSettings.update({
    where: { id: session.tenant.clinicId },
    data: { customDomainVerifiedAt: new Date() },
  })

  await recordAudit({
    action: "tenant.domain_verified",
    subjectType: "clinic",
    subjectId: session.tenant.clinicId,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    metadata: { domain: clinic.customDomain },
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

  const previous = await prisma.clinicSettings.findUnique({
    where: { id: session.tenant.clinicId },
    select: { customDomain: true, customDomainVerifiedAt: true },
  })

  // Tier A. Releasing a domain changes which hosts serve this clinic, and the
  // entry names the domain that was released — without it the record would say
  // a domain was removed without saying which host stopped answering.
  const requestId = await currentRequestId()
  await prisma.$transaction(async (tx) => {
    await tx.clinicSettings.update({
      where: { id: session.tenant.clinicId },
      data: {
        customDomain: null,
        customDomainToken: null,
        customDomainVerifiedAt: null,
      },
    })

    await recordAuditIn(tx, {
      action: "tenant.domain_removed",
      subjectType: "clinic",
      subjectId: session.tenant.clinicId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      requestId,
      metadata: {
        domain: previous?.customDomain ?? null,
        wasVerified: Boolean(previous?.customDomainVerifiedAt),
      },
    })
  })

  revalidateDomain()
}
