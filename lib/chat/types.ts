import type { NaturalRecommendation, ProductRecommendation } from "@/lib/scan/types"

export type ChatMessageMetadata = {
  naturalRecommendations?: NaturalRecommendation[]
  productRecommendations?: ProductRecommendation[]
  disclaimer?: string
  consultationNote?: string
}
