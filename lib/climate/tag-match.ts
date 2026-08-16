import type { ProductClimateTag } from "@/lib/products/constants"
import type { UserScanContext } from "@/lib/ai/types"

function isElevatedBand(band: string | null | undefined) {
  return band === "high" || band === "extreme"
}

/** Maps live climate context to catalog `climateTags` for runtime matching. */
export function mapUserClimateToTags(
  location: UserScanContext["location"],
): ProductClimateTag[] {
  if (!location) return []

  const tags = new Set<ProductClimateTag>()

  if (isElevatedBand(location.uvIndexBand)) {
    tags.add("high_uv")
  }

  if (
    isElevatedBand(location.humidityBand) ||
    location.climateZone === "humid_subtropical" ||
    location.climateZone === "temperate_humid"
  ) {
    tags.add("humid")
  }

  if (
    location.humidityBand === "low" ||
    location.climateZone === "arid"
  ) {
    tags.add("dry")
  }

  if (
    location.temperatureBand === "low" ||
    location.climateZone === "cold"
  ) {
    tags.add("cold")
  }

  return [...tags]
}

export function productMatchesClimateTags(
  productTags: string[],
  activeTags: ProductClimateTag[],
): boolean {
  if (activeTags.length === 0 || productTags.length === 0) return false
  const tagSet = new Set(productTags)
  return activeTags.some((tag) => tagSet.has(tag))
}

export function rankCatalogByClimateTags<
  T extends { slug: string; climateTags: string[] },
>(catalog: T[], activeTags: ProductClimateTag[]): T[] {
  if (activeTags.length === 0) return catalog

  const matching: T[] = []
  const neutral: T[] = []

  for (const product of catalog) {
    if (productMatchesClimateTags(product.climateTags, activeTags)) {
      matching.push(product)
    } else {
      neutral.push(product)
    }
  }

  return [...matching, ...neutral]
}
