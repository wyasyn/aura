import { prisma } from "@/lib/db/client"
import { INGREDIENT_REFERENCE_SEED } from "@/lib/ingredients/reference-seed"
import { resolveLinks } from "@/lib/ingredients/link-products"
import { parseInciList } from "@/lib/products/parse-inci"

export async function seedIngredientReference(): Promise<number> {
  let count = 0

  for (const item of INGREDIENT_REFERENCE_SEED) {
    await prisma.ingredient.upsert({
      where: { inciName: item.inciName },
      create: {
        inciName: item.inciName,
        displayName: item.displayName ?? item.inciName,
        synonyms: item.synonyms ?? [],
        targetConcerns: item.targetConcerns ?? [],
        suitableSkinTypes: item.suitableSkinTypes ?? [],
        climateTags: item.climateTags ?? [],
        doshaAffinities: item.doshaAffinities ?? [],
        functions: item.functions ?? [],
        source: item.source ?? "unspecified",
        benefits: item.benefits ?? [],
        avoidWith: item.avoidWith ?? [],
        notes: item.notes ?? null,
      },
      update: {
        displayName: item.displayName ?? item.inciName,
        synonyms: item.synonyms ?? [],
        targetConcerns: item.targetConcerns ?? [],
        suitableSkinTypes: item.suitableSkinTypes ?? [],
        climateTags: item.climateTags ?? [],
        doshaAffinities: item.doshaAffinities ?? [],
        functions: item.functions ?? [],
        source: item.source ?? "unspecified",
        benefits: item.benefits ?? [],
        avoidWith: item.avoidWith ?? [],
        notes: item.notes ?? null,
      },
    })
    count += 1
  }

  return count
}

export async function backfillProductIngredientLists(): Promise<number> {
  const products = await prisma.product.findMany({
    select: { id: true, ingredients: true, ingredientList: true },
  })

  let updated = 0

  for (const product of products) {
    if (product.ingredientList.length > 0 || !product.ingredients?.trim()) {
      continue
    }

    const parsed = parseInciList(product.ingredients)
    if (!parsed.isLikelyInciList) {
      continue
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { ingredientList: parsed.items },
    })
    updated += 1
  }

  return updated
}

export type LinkProductsResult = {
  productsExamined: number
  productsLinked: number
  linksWritten: number
}

/**
 * Writes the ProductIngredient join for every product that has ingredient text.
 *
 * Rewrites each product's links rather than merging into them, inside one
 * transaction per product. A merge would leave behind rows for ingredients a
 * reformulation removed, and a product's ingredient list is the whole truth
 * about that product, not an increment to it.
 */
export async function linkProductIngredients(): Promise<LinkProductsResult> {
  const ingredients = await prisma.ingredient.findMany({
    select: {
      id: true,
      inciName: true,
      displayName: true,
      synonyms: true,
      functions: true,
    },
  })

  const products = await prisma.product.findMany({
    select: { id: true, ingredientList: true, ingredients: true },
  })

  let productsLinked = 0
  let linksWritten = 0

  for (const product of products) {
    const tokens =
      product.ingredientList.length > 0
        ? product.ingredientList
        : parseInciList(product.ingredients ?? "").items

    if (tokens.length === 0) continue

    const links = resolveLinks(tokens, ingredients)
    if (links.length === 0) continue

    await prisma.$transaction([
      prisma.productIngredient.deleteMany({ where: { productId: product.id } }),
      prisma.productIngredient.createMany({
        data: links.map((link) => ({ productId: product.id, ...link })),
      }),
    ])

    productsLinked += 1
    linksWritten += links.length
  }

  return { productsExamined: products.length, productsLinked, linksWritten }
}
