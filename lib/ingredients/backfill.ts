import { prisma } from "@/lib/db/client"
import { INGREDIENT_REFERENCE_SEED } from "@/lib/ingredients/reference-seed"
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
        notes: item.notes ?? null,
      },
      update: {
        displayName: item.displayName ?? item.inciName,
        synonyms: item.synonyms ?? [],
        targetConcerns: item.targetConcerns ?? [],
        suitableSkinTypes: item.suitableSkinTypes ?? [],
        climateTags: item.climateTags ?? [],
        doshaAffinities: item.doshaAffinities ?? [],
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
