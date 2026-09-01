"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { revalidateTenantCatalogContext } from "@/lib/ai/context/cache-tags"
import { recordAudit, recordDenied } from "@/lib/audit/log"
import { currentRequestId } from "@/lib/audit/request-id"
import { requireClinicMember } from "@/lib/clinics/membership"
import { requirePermission } from "@/lib/clinics/permissions"
import { prisma } from "@/lib/db/client"
import { productIntelligenceFields } from "@/lib/products/intelligence-fields"
import { normalizeProductInput } from "@/lib/products/normalize"
import { clinicProductFormSchema } from "@/lib/products/schemas"

/**
 * A clinic's own catalogue.
 *
 * The mirror of lib/products/actions.ts, which administers Aurora's global
 * products. The difference is where the tenant comes from: an administrator
 * names one, a clinic never does. Every query and mutation here is bounded by
 * session.scope, minted from an active membership, so there is no id a caller
 * could supply to reach another clinic's products.
 *
 * organizationId is set from the session on create and is never accepted as
 * input, which is what makes "change a product's owner" unrepresentable rather
 * than merely forbidden.
 */

const productIdSchema = z.object({ productId: z.string().trim().min(1) })

const recommendableSchema = productIdSchema.extend({
  isRecommendable: z.boolean(),
})

/** Lists this clinic's own products. Aurora's are read through the catalogue. */
export async function listClinicProductsAction() {
  const session = await requireClinicMember()
  requirePermission(session, "PRODUCT_VIEW")

  return prisma.product.findMany({
    where: { organizationId: session.scope },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      description: true,
      brand: true,
      category: true,
      primaryClassification: true,
      secondaryClassifications: true,
      classificationConfidence: true,
      cosmeticBenefits: true,
      routineCategory: true,
      priceCents: true,
      currency: true,
      availability: true,
      completenessScore: true,
      ingredients: true,
      ingredientList: true,
      targetConcerns: true,
      suitableSkinTypes: true,
      climateTags: true,
      imageUrl: true,
      storeUrl: true,
      isActive: true,
      isRecommendable: true,
      updatedAt: true,
    },
  })
}

export async function createClinicProductAction(input: unknown) {
  const session = await requireClinicMember()
  requirePermission(session, "PRODUCT_MANAGE")

  const form = clinicProductFormSchema.parse(input)
  // isActive is not the clinic's to set through this form: creation is always
  // active and withdrawal goes through archiveClinicProductAction.
  const normalized = normalizeProductInput({ ...form, isActive: true })
  const intelligence = productIntelligenceFields(form)

  const product = await prisma.product.create({
    data: {
      // A clinic product is entered by a person in the clinic editor. It has
      // no store origin, so a WooCommerce sync never touches it.
      source: "manual",
      sku: normalized.sku,
      name: normalized.name,
      slug: normalized.slug,
      description: normalized.description,
      category: normalized.category,
      ...intelligence,
      ingredients: normalized.ingredients || null,
      ingredientList: normalized.ingredientList,
      targetConcerns: normalized.targetConcerns,
      suitableSkinTypes: normalized.suitableSkinTypes,
      climateTags: normalized.climateTags,
      imageUrl: normalized.imageUrl || null,
      storeUrl: normalized.storeUrl || null,
      isActive: true,
      isRecommendable: form.isRecommendable,
      createdById: session.userId,
      // From the session, never from the form.
      organizationId: session.scope,
    },
    select: { id: true, name: true, slug: true },
  })

  await recordAudit({
    action: "product.created",
    subjectType: "product",
    subjectId: product.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    requestId: await currentRequestId(),
    metadata: {
      name: product.name,
      slug: product.slug,
      classifications: form.classifications,
      isRecommendable: form.isRecommendable,
    },
  })

  revalidateTenantCatalogContext(session.tenant.organizationId)
  revalidatePath("/clinic/products")
  return { id: product.id }
}

/**
 * Loads one of this clinic's products, or records the attempt and refuses.
 *
 * findFirst on the pair rather than findUnique on the id: a lookup by id alone
 * would read an Aurora product or another clinic's, and leave the ownership
 * check to whatever the caller remembers to do next.
 */
async function loadOwnProduct(
  session: Awaited<ReturnType<typeof requireClinicMember>>,
  productId: string,
  action: "product.updated" | "product.archived" | "product.recommendation_enabled" | "product.recommendation_disabled",
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: session.scope },
    select: { id: true, name: true, sku: true, slug: true, isActive: true, isRecommendable: true },
  })

  if (!product) {
    // An Aurora product and another clinic's product are refused identically,
    // and neither is distinguishable from one that does not exist.
    await recordDenied({
      action,
      subjectType: "product",
      subjectId: productId,
      actorId: session.userId,
      actorRole: session.role,
      organizationId: session.tenant.organizationId,
      metadata: { reason: "not_owned_by_tenant" },
    })
    throw new Error("Product not found")
  }

  return product
}

export async function updateClinicProductAction(input: unknown) {
  const session = await requireClinicMember()
  requirePermission(session, "PRODUCT_MANAGE")

  const { productId, ...rest } = z
    .object({ productId: z.string().trim().min(1) })
    .passthrough()
    .parse(input)

  const existing = await loadOwnProduct(session, productId, "product.updated")
  const form = clinicProductFormSchema.parse(rest)
  const normalized = normalizeProductInput({ ...form, isActive: true }, {
    existingSku: existing.sku,
    existingSlug: existing.slug,
  })

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      name: normalized.name,
      description: normalized.description,
      category: normalized.category,
      ...productIntelligenceFields(form),
      ingredients: normalized.ingredients || null,
      ingredientList: normalized.ingredientList,
      targetConcerns: normalized.targetConcerns,
      suitableSkinTypes: normalized.suitableSkinTypes,
      climateTags: normalized.climateTags,
      imageUrl: normalized.imageUrl || null,
      storeUrl: normalized.storeUrl || null,
      isRecommendable: form.isRecommendable,
    },
  })

  await recordAudit({
    action: "product.updated",
    subjectType: "product",
    subjectId: existing.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    requestId: await currentRequestId(),
    metadata: { name: normalized.name, classifications: form.classifications },
  })

  revalidateTenantCatalogContext(session.tenant.organizationId)
  revalidatePath("/clinic/products")
  return { id: existing.id }
}

/**
 * Archives a product.
 *
 * A state change, not a delete, matching how memberships end. The product stays
 * on record so recommendations a patient already holds keep resolving to a real
 * name and image; it simply stops entering new advice.
 */
export async function archiveClinicProductAction(input: unknown) {
  const session = await requireClinicMember()
  requirePermission(session, "PRODUCT_MANAGE")

  const { productId } = productIdSchema.parse(input)
  const existing = await loadOwnProduct(session, productId, "product.archived")

  await prisma.product.update({
    where: { id: existing.id },
    data: { isActive: false, isRecommendable: false },
  })

  await recordAudit({
    action: "product.archived",
    subjectType: "product",
    subjectId: existing.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    requestId: await currentRequestId(),
    metadata: { name: existing.name, slug: existing.slug },
  })

  revalidateTenantCatalogContext(session.tenant.organizationId)
  revalidatePath("/clinic/products")
  return { id: existing.id }
}

/** Withdraws a product from the engine, or puts it back, without archiving it. */
export async function setClinicProductRecommendableAction(input: unknown) {
  const session = await requireClinicMember()
  requirePermission(session, "PRODUCT_MANAGE")

  const { productId, isRecommendable } = recommendableSchema.parse(input)
  const action = isRecommendable
    ? "product.recommendation_enabled"
    : "product.recommendation_disabled"

  const existing = await loadOwnProduct(session, productId, action)

  await prisma.product.update({
    where: { id: existing.id },
    data: { isRecommendable },
  })

  await recordAudit({
    action,
    subjectType: "product",
    subjectId: existing.id,
    actorId: session.userId,
    actorRole: session.role,
    organizationId: session.tenant.organizationId,
    requestId: await currentRequestId(),
    metadata: { name: existing.name },
  })

  revalidateTenantCatalogContext(session.tenant.organizationId)
  revalidatePath("/clinic/products")
  return { id: existing.id, isRecommendable }
}
