import { GoogleGenAI } from "@google/genai"

import { mapGeminiUsageMetadata, type MappedGeminiUsage } from "@/lib/ai/providers/gemini-usage"
import {
  productExtractionJsonSchema,
  productExtractionSchema,
  type ProductExtraction,
} from "@/lib/products/enrich/schema"

/**
 * Reads one product's own description into structured columns.
 *
 * This is the only place Gemini touches the recommendation pipeline's inputs,
 * and it is deliberately an offline extraction rather than a request-time
 * judgement: the model is shown a product and asked what that product is. It
 * never sees a user, a scan, a profile or a catalogue, so it cannot express a
 * preference between products even accidentally. Deciding which product suits
 * which person is Aurora's, and happens later, from these columns.
 */

export type ProductToEnrich = {
  slug: string
  name: string
  description: string
  /** WooCommerce merchandising taxonomy — a hint, not a classification. */
  category: string
  ingredients: string | null
}

const SYSTEM_INSTRUCTION = `You classify cosmetic products for a skincare catalogue.

You are given one product's own name, description and ingredient text. Return
structured attributes describing WHAT THAT PRODUCT IS. You are not recommending
it to anyone and you will never be told who might use it.

Rules:
- Use only the supplied text. Never infer attributes from what products of this
  type usually contain or usually do.
- Prefer an empty array to a guess. An empty array means the description does
  not say; listing every option "to be safe" destroys the field's meaning,
  because a product suitable for all five skin types is indistinguishable from
  one nobody assessed.
- Cosmetic language only. Encode "supports the moisture barrier"; never encode
  a claim to treat, heal or cure. If the description makes a medical claim, do
  not carry it across — pick the nearest cosmetic benefit or leave it out.
- keyIngredients lists only ingredients the text actually names.
- The merchandising category is a hint about where the product is sold, not
  what it is. A product sold under "for-him" is still a cleanser or a hair oil.`

function buildPrompt(product: ProductToEnrich): string {
  return [
    `Name: ${product.name}`,
    `Merchandising category: ${product.category}`,
    `Description: ${product.description}`,
    product.ingredients?.trim()
      ? `Ingredient text: ${product.ingredients}`
      : `Ingredient text: (none supplied)`,
  ].join("\n\n")
}

export type ExtractionResult = {
  extraction: ProductExtraction
  usage: MappedGeminiUsage
}

export async function extractProductAttributes(
  product: ProductToEnrich,
  modelId: string,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: buildPrompt(product) }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: productExtractionJsonSchema,
      // Low rather than zero. This is an extraction, and a description that
      // genuinely supports two readings should not be forced to look certain.
      temperature: 0.1,
    },
  })

  if (!response.text) {
    throw new Error(`Empty extraction response for ${product.slug}`)
  }

  return {
    extraction: productExtractionSchema.parse(JSON.parse(response.text)),
    usage: mapGeminiUsageMetadata("gemini", modelId, response.usageMetadata),
  }
}
