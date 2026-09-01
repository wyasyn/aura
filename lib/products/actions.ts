"use server"

import { revalidatePath } from "next/cache"

import { revalidateCatalogContext } from "@/lib/ai/context/cache-tags"
import { recordAudit } from "@/lib/audit/log"
import { requireAdmin } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { productIntelligenceFields } from "@/lib/products/intelligence-fields"
import { evaluateEligibility } from "@/lib/products/intelligence/eligibility"
import { extractProductIntelligence } from "@/lib/products/intelligence/extract-product"
import {
  changedFields,
  markProvenance,
  readProvenance,
} from "@/lib/products/intelligence/provenance"
import { normalizeProductInput } from "@/lib/products/normalize"
import { productFormSchema, productSchema } from "@/lib/products/schemas"

export async function listProductsAction() {
  await requireAdmin()
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function createProductAction(input: unknown) {
  const session = await requireAdmin()
  const form = productFormSchema.parse(input)
  const normalized = normalizeProductInput(form)
  const data = productSchema.parse(normalized)

  const product = await prisma.product.create({
    data: {
      ...data,
      // Derived rather than copied: the classification is split, the routine
      // step looked up, and the completeness score recomputed. Shared with the
      // clinic editor so both catalogues are described identically.
      ...productIntelligenceFields(form),
      ingredients: data.ingredients || null,
      ingredientList: normalized.ingredientList,
      imageUrl: data.imageUrl || null,
      storeUrl: data.storeUrl || null,
      // Typed in by a person rather than fetched from the store. Recorded so a
      // store sync can never adopt, overwrite or archive it.
      source: "manual",
      // A product nothing has assessed is not yet intelligible to the engine.
      // Set explicitly rather than left to the column default so the intent is
      // visible at the point of creation.
      intelligenceStatus: "pending",
      // Never recommendable on creation. Eligibility is decided after
      // extraction, against the engine's own requirements — a product cannot
      // be advertised as suitable for anyone before anything has established
      // what it is.
      isRecommendable: false,
      createdById: session.user.id,
    },
  })

  // Extraction runs after the product is committed, never inside the same
  // write. A model call that fails must leave a saved product with a recorded
  // reason and a retry available, not roll the product back.
  //
  // There is no background job queue in this application, so this runs inline
  // and the caller waits for one model call. That is a real limitation, stated
  // rather than disguised behind a promise nothing keeps.
  const extraction = await extractProductIntelligence(product.id)

  if (extraction.ok) {
    await applyEligibility(product.id)
  }

  revalidatePath("/admin")
  revalidatePath("/admin/products")
  revalidateCatalogContext()

  return { product, extraction }
}

/**
 * Sets `isRecommendable` from what the data now supports.
 *
 * Eligibility is a statement about the product's intelligence; `isRecommendable`
 * is the switch the engine reads. Deriving one from the other here means a
 * newly created product becomes recommendable exactly when it earns it, rather
 * than by default.
 *
 * Only ever applied on creation and on an explicit retry. It does not run over
 * the existing catalogue, because an administrator who deliberately withdrew a
 * product should not find it silently reinstated by an extraction.
 */
async function applyEligibility(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      isActive: true,
      intelligenceStatus: true,
      intelligenceStale: true,
      completenessScore: true,
      primaryClassification: true,
      targetConcerns: true,
    },
  })
  if (!product) return

  const { eligible } = evaluateEligibility(product)

  await prisma.product.update({
    where: { id: productId },
    data: { isRecommendable: eligible },
  })
}

/**
 * Runs extraction again for one product, at an administrator's request.
 *
 * Distinct from the automatic pass: `force` bypasses the in-flight guard,
 * because an explicit retry is somebody saying the previous attempt is not
 * coming back.
 */
export async function retryProductExtractionAction(productId: string) {
  await requireAdmin()

  const extraction = await extractProductIntelligence(productId, { force: true })
  if (extraction.ok) {
    await applyEligibility(productId)
  }

  revalidatePath("/admin/products")
  revalidateCatalogContext()

  return extraction
}

export async function updateProductAction(id: string, input: unknown) {
  const session = await requireAdmin()
  const form = productFormSchema.parse(input)

  const existing = await prisma.product.findUnique({
    where: { id },
    select: {
      sku: true,
      slug: true,
      organizationId: true,
      intelligenceProvenance: true,
      // Read before the write so the fields an administrator actually changed
      // can be told from the ones they left alone. Marking everything as theirs
      // would claim they reviewed the whole product when they corrected a line.
      primaryClassification: true,
      secondaryClassifications: true,
      suitableSkinTypes: true,
      targetConcerns: true,
      cosmeticBenefits: true,
      climateTags: true,
      suitableHumidity: true,
      suitableTemperature: true,
      suitableUv: true,
      routineCategory: true,
      ingredientList: true,
      brand: true,
    },
  })
  if (!existing) {
    throw new Error("Product not found")
  }

  const normalized = normalizeProductInput(form, {
    existingSku: existing.sku,
    existingSlug: existing.slug,
  })
  const data = productSchema.parse(normalized)

  const intelligence = productIntelligenceFields(form)

  // Concerns, skin types and climate tags come from the base schema rather than
  // productIntelligenceFields, so they have to be gathered explicitly. Omitting
  // them left them reading as `undefined` against a populated previous value,
  // which marked them administrator-corrected on every save — the exact false
  // attribution the provenance table exists to avoid.
  const nextValues = {
    ...intelligence,
    targetConcerns: data.targetConcerns,
    suitableSkinTypes: data.suitableSkinTypes,
    climateTags: data.climateTags,
    ingredientList: normalized.ingredientList,
  }

  // Only what actually changed is attributed to the administrator. Everything
  // else keeps whichever origin last wrote it.
  const corrected = changedFields(existing, nextValues)
  const provenance = markProvenance(
    readProvenance(existing.intelligenceProvenance),
    corrected,
    "admin",
  )

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      // Derived rather than copied: the classification is split, the routine
      // step looked up, and the completeness score recomputed. Shared with the
      // clinic editor so both catalogues are described identically.
      ...intelligence,
      ingredients: data.ingredients || null,
      ingredientList: normalized.ingredientList,
      imageUrl: data.imageUrl || null,
      storeUrl: data.storeUrl || null,
      intelligenceProvenance: provenance,
    },
  })

  if (corrected.length > 0) {
    await recordAudit({
      action: "product.intelligence_corrected",
      subjectType: "product",
      subjectId: id,
      actorId: session.user.id,
      actorRole: session.user.role ?? null,
      organizationId: existing.organizationId,
      result: "success",
      // The field names only. The values are cosmetic product metadata rather
      // than secrets, but the names are what answers "what did somebody change"
      // without turning the audit log into a second copy of the catalogue.
      metadata: { slug: existing.slug, fields: corrected },
    })
  }

  revalidatePath("/admin")
  revalidatePath("/admin/products")
  revalidateCatalogContext()
  return product
}

export async function deleteProductAction(id: string) {
  await requireAdmin()
  await prisma.product.delete({ where: { id } })
  revalidatePath("/admin")
  revalidatePath("/admin/products")
  revalidateCatalogContext()
}
