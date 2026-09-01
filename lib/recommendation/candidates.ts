import { prisma } from "@/lib/db/client"
import {
  currentCatalogueScope,
  recommendableProductsWhere,
  type CatalogueScope,
} from "@/lib/products/catalogue-scope"
import { withDbRetry } from "@/lib/db/retry"
import type { CandidateProduct } from "@/lib/recommendation/types"

/**
 * Loads the products the engine is allowed to consider.
 *
 * Tenant-scoped through the same helper the rest of the catalogue uses, so
 * there is no second definition of "which products may this request see". A
 * separate query here that forgot the scope would hand one clinic's catalogue
 * to another, which is precisely the failure the shared helper exists to make
 * impossible.
 */

const CANDIDATE_SELECT = {
  slug: true,
  name: true,
  description: true,
  category: true,
  brand: true,
  primaryClassification: true,
  secondaryClassifications: true,
  classificationConfidence: true,
  targetConcerns: true,
  suitableSkinTypes: true,
  cosmeticBenefits: true,
  climateTags: true,
  suitableHumidity: true,
  suitableTemperature: true,
  suitableUv: true,
  routineCategory: true,
  routineStep: true,
  amSuitable: true,
  pmSuitable: true,
  availability: true,
  isActive: true,
  isRecommendable: true,
  completenessScore: true,
  ingredients: true,
  ingredientList: true,
  imageUrl: true,
  storeUrl: true,
  organizationId: true,
  ingredientLinks: {
    select: {
      role: true,
      isKeyActive: true,
      position: true,
      ingredient: {
        select: {
          inciName: true,
          displayName: true,
          targetConcerns: true,
          benefits: true,
          doshaAffinities: true,
          avoidWith: true,
        },
      },
    },
  },
} as const

type CandidateRow = Awaited<
  ReturnType<typeof prisma.product.findMany<{ select: typeof CANDIDATE_SELECT }>>
>[number]

function toCandidate(row: CandidateRow): CandidateProduct {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    brand: row.brand,
    primaryClassification: row.primaryClassification,
    secondaryClassifications: row.secondaryClassifications,
    classificationConfidence: row.classificationConfidence,
    targetConcerns: row.targetConcerns,
    suitableSkinTypes: row.suitableSkinTypes,
    cosmeticBenefits: row.cosmeticBenefits,
    climateTags: row.climateTags,
    suitableHumidity: row.suitableHumidity,
    suitableTemperature: row.suitableTemperature,
    suitableUv: row.suitableUv,
    routineCategory: row.routineCategory,
    routineStep: row.routineStep,
    amSuitable: row.amSuitable,
    pmSuitable: row.pmSuitable,
    availability: row.availability,
    isActive: row.isActive,
    isRecommendable: row.isRecommendable,
    completenessScore: row.completenessScore,
    ingredients: row.ingredients,
    ingredientList: row.ingredientList,
    imageUrl: row.imageUrl,
    storeUrl: row.storeUrl,
    // Which catalogue, never which organization. The id stays server-side.
    source: row.organizationId ? "clinic" : "aurora",
    ingredientLinks: row.ingredientLinks.map((link) => ({
      inciName: link.ingredient.inciName,
      displayName: link.ingredient.displayName,
      role: link.role,
      isKeyActive: link.isKeyActive,
      position: link.position,
      targetConcerns: link.ingredient.targetConcerns,
      benefits: link.ingredient.benefits,
      doshaAffinities: link.ingredient.doshaAffinities,
      avoidWith: link.ingredient.avoidWith,
    })),
  }
}

export async function loadCandidates(
  scope?: CatalogueScope,
): Promise<CandidateProduct[]> {
  const resolved = scope === undefined ? await currentCatalogueScope() : scope

  const rows = await withDbRetry(() =>
    prisma.product.findMany({
      where: recommendableProductsWhere(resolved),
      orderBy: { name: "asc" },
      select: CANDIDATE_SELECT,
    }),
  )

  return rows.map(toCandidate)
}
