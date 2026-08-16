import { prisma } from "@/lib/db/client"

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

export async function resolveIngredientReference(
  token: string,
): Promise<{
  inciName: string
  displayName: string | null
  targetConcerns: string[]
  suitableSkinTypes: string[]
  climateTags: string[]
  doshaAffinities: string[]
} | null> {
  const needle = normalizeToken(token)
  if (!needle) return null

  const ingredients = await prisma.ingredient.findMany({
    select: {
      inciName: true,
      displayName: true,
      synonyms: true,
      targetConcerns: true,
      suitableSkinTypes: true,
      climateTags: true,
      doshaAffinities: true,
    },
  })

  for (const ingredient of ingredients) {
    const candidates = [
      ingredient.inciName,
      ingredient.displayName ?? "",
      ...ingredient.synonyms,
    ]
      .map(normalizeToken)
      .filter(Boolean)

    if (candidates.some((candidate) => needle.includes(candidate) || candidate.includes(needle))) {
      return ingredient
    }
  }

  return null
}

export async function enrichIngredientTokens(tokens: string[]) {
  const resolved = await Promise.all(tokens.map((token) => resolveIngredientReference(token)))
  return resolved.filter((item): item is NonNullable<typeof item> => item !== null)
}
