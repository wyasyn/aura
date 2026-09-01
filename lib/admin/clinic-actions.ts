"use server"

import { recordAudit } from "@/lib/audit/log"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth/session"
import { clinicPlanSchema, createClinicSchema } from "@/lib/clinics/schemas"
import {
  createStripePriceForPlan,
  stripePriceNeedsRefresh,
} from "@/lib/clinics/stripe-price"
import { prisma } from "@/lib/db/client"

function revalidateClinics() {
  revalidatePath("/admin/clinics")
}

/**
 * Provisions a clinic: the better-auth Organization, its owner Member row, and
 * the white-label ClinicSettings, in one transaction so a failure can't leave a
 * half-created tenant holding a subdomain.
 */
export async function createClinicAction(input: unknown) {
  const session = await requireAdmin()
  const data = createClinicSchema.parse(input)

  const owner = await prisma.user.findUnique({
    where: { email: data.ownerEmail },
    select: { id: true, role: true },
  })
  if (!owner) {
    throw new Error(
      `No account found for ${data.ownerEmail}. Ask them to sign up first, then provision the clinic.`,
    )
  }

  const existing = await prisma.clinicSettings.findFirst({
    where: { OR: [{ subdomain: data.subdomain }] },
    select: { id: true },
  })
  if (existing) {
    throw new Error(`The subdomain "${data.subdomain}" is already taken.`)
  }

  const organizationId = randomUUID()

  await prisma.$transaction(async (tx) => {
    await tx.organization.create({
      data: {
        id: organizationId,
        name: data.name,
        // better-auth's organization plugin keys on slug; matching it to the
        // subdomain keeps the two identifiers from drifting apart.
        slug: data.subdomain,
      },
    })

    await tx.member.create({
      data: {
        id: randomUUID(),
        organizationId,
        userId: owner.id,
        role: "owner",
      },
    })

    await tx.clinicSettings.create({
      data: {
        organizationId,
        subdomain: data.subdomain,
        displayName: data.displayName ?? data.name,
        planId: data.planId ?? null,
        // A comped clinic is entitled immediately; otherwise it stays dark
        // until it completes Stripe checkout.
        subscriptionStatus: data.compAccess ? "active" : "none",
        periodStartedAt: data.compAccess ? new Date() : null,
      },
    })

    // Only promote a plain user. Overwriting an existing admin/expert/affiliate
    // role here would silently strip that person's platform access, and tenant
    // permissions already live on the Member row regardless.
    if (owner.role === "user" || owner.role === null) {
      await tx.user.update({
        where: { id: owner.id },
        data: { role: "company_admin" },
      })
    }
  })

  // The counterpart of tenant.deleted. Without it a tenant's existence has a
  // recorded end but no recorded beginning, and "who provisioned this clinic,
  // and who did they make its owner" is answerable only from the rows that a
  // later deletion would take with it.
  await recordAudit({
    action: "tenant.created",
    subjectType: "clinic",
    subjectId: organizationId,
    actorId: session.user.id,
    actorRole: "admin",
    organizationId,
    metadata: {
      subdomain: data.subdomain,
      displayName: data.displayName ?? data.name,
      ownerUserId: owner.id,
      planId: data.planId ?? null,
      compAccess: Boolean(data.compAccess),
    },
  })

  revalidateClinics()
  return { organizationId, subdomain: data.subdomain }
}

const statusSchema = z.object({
  clinicId: z.string().trim().min(1),
  status: z.enum(["active", "suspended"]),
})

export async function setClinicStatusAction(input: unknown) {
  const session = await requireAdmin()
  const { clinicId, status } = statusSchema.parse(input)

  const clinic = await prisma.clinicSettings.update({
    where: { id: clinicId },
    data: { status },
    select: { organizationId: true, subdomain: true },
  })

  await recordAudit({
    action: status === "suspended" ? "tenant.suspended" : "tenant.updated",
    subjectType: "clinic",
    subjectId: clinic.organizationId,
    actorId: session.user.id,
    actorRole: "admin",
    organizationId: clinic.organizationId,
    metadata: { subdomain: clinic.subdomain, status },
  })

  revalidateClinics()
}

const planAssignSchema = z.object({
  clinicId: z.string().trim().min(1),
  planId: z.string().trim().min(1).nullable(),
})

export async function setClinicPlanAction(input: unknown) {
  const session = await requireAdmin()
  const { clinicId, planId } = planAssignSchema.parse(input)

  const clinic = await prisma.clinicSettings.update({
    where: { id: clinicId },
    data: { planId },
    select: { organizationId: true, subdomain: true },
  })

  await recordAudit({
    action: "tenant.plan_changed",
    subjectType: "clinic",
    subjectId: clinic.organizationId,
    actorId: session.user.id,
    actorRole: "admin",
    organizationId: clinic.organizationId,
    metadata: { subdomain: clinic.subdomain, planId },
  })

  revalidateClinics()
}

const compAccessSchema = z.object({
  clinicId: z.string().trim().min(1),
  comped: z.boolean(),
})

/**
 * Grants or revokes access outside Stripe. Refuses to touch a clinic that has a
 * real Stripe subscription, because overwriting subscriptionStatus there would
 * be silently undone by the next webhook and give a misleading admin view.
 */
export async function setClinicCompAccessAction(input: unknown) {
  const session = await requireAdmin()
  const { clinicId, comped } = compAccessSchema.parse(input)

  const clinic = await prisma.clinicSettings.findUnique({
    where: { id: clinicId },
    select: {
      stripeSubscriptionId: true,
      periodStartedAt: true,
      organizationId: true,
      subdomain: true,
    },
  })
  if (!clinic) throw new Error("Clinic not found")
  if (clinic.stripeSubscriptionId) {
    throw new Error(
      "This clinic bills through Stripe. Manage its access from the subscription instead.",
    )
  }

  await prisma.clinicSettings.update({
    where: { id: clinicId },
    data: {
      subscriptionStatus: comped ? "active" : "none",
      periodStartedAt: comped ? (clinic.periodStartedAt ?? new Date()) : null,
    },
  })

  // Granting free access is a billing decision made by a person, and revoking
  // it takes a live clinic dark. Both need to be answerable later.
  await recordAudit({
    action: "tenant.comp_access_changed",
    subjectType: "clinic",
    subjectId: clinic.organizationId,
    actorId: session.user.id,
    actorRole: "admin",
    organizationId: clinic.organizationId,
    metadata: { subdomain: clinic.subdomain, comped },
  })

  revalidateClinics()
}

export async function upsertClinicPlanAction(input: unknown) {
  await requireAdmin()
  const parsed = clinicPlanSchema.extend({ id: z.string().trim().optional() }).parse(input)
  const { id, ...data } = parsed

  const previous = id
    ? await prisma.clinicPlan.findUnique({
        where: { id },
        select: { priceCents: true, interval: true, stripePriceId: true },
      })
    : null

  // An id typed by hand wins: the admin is pointing at a specific Stripe price
  // and we should not quietly replace it with a generated one.
  const manualPriceId =
    data.stripePriceId && data.stripePriceId !== previous?.stripePriceId
      ? data.stripePriceId
      : null

  let stripePriceId = data.stripePriceId ?? previous?.stripePriceId ?? undefined

  if (!manualPriceId && stripePriceNeedsRefresh(previous, data)) {
    // Stripe prices are immutable, so a changed amount needs a new one. See
    // lib/clinics/stripe-price.ts.
    const created = await createStripePriceForPlan(data)
    if (created) stripePriceId = created
  }

  const record = { ...data, stripePriceId }

  if (id) {
    await prisma.clinicPlan.update({ where: { id }, data: record })
  } else {
    await prisma.clinicPlan.create({ data: record })
  }

  revalidateClinics()
  revalidatePath("/clinic/billing")
}

const deletePlanSchema = z.object({ id: z.string().trim().min(1) })

export async function deleteClinicPlanAction(input: unknown) {
  await requireAdmin()
  const { id } = deletePlanSchema.parse(input)

  const inUse = await prisma.clinicSettings.count({ where: { planId: id } })
  if (inUse > 0) {
    throw new Error(
      `${inUse} clinic${inUse === 1 ? "" : "s"} still on this plan. Move them off it first, or deactivate the plan instead.`,
    )
  }

  await prisma.clinicPlan.delete({ where: { id } })
  revalidateClinics()
}
