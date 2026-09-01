import type { ScoringWeights } from "@/lib/recommendation/weights"

/**
 * What each scoring factor actually measures.
 *
 * The names are the engine's own — the keys of ScoringWeights — rather than a
 * friendlier set invented for the form. A configuration screen that renamed the
 * axes would leave an administrator tuning "Ingredient Compatibility" with no
 * way to connect it to the `ingredientEvidence` figure in a recommendation's
 * stored breakdown.
 *
 * Each description says what the axis reads, not what it is for. "Measures how
 * well the product suits the user" is true of every axis and tells nobody
 * anything.
 */

export type WeightAxisCopy = {
  key: keyof ScoringWeights
  label: string
  description: string
  /** Multipliers behave differently from the additive axes and are grouped apart. */
  kind: "axis" | "multiplier"
}

export const WEIGHT_AXIS_COPY: readonly WeightAxisCopy[] = [
  {
    key: "concernMatch",
    label: "Skin concern match",
    description:
      "How strongly the product's declared concerns answer what this person asserts — findings the scan photographed at moderate or above, plus concerns and goals stated in their profile. Photographed evidence counts for more than self-report, and a stated concern the photo confirms counts for both.",
    kind: "axis",
  },
  {
    key: "skinTypeFit",
    label: "Skin type compatibility",
    description:
      "Whether the product lists this person's skin type as suitable. A product with no skin types recorded scores zero here rather than counting against itself — an empty list means nobody assessed it, not that it suits nobody.",
    kind: "axis",
  },
  {
    key: "ingredientEvidence",
    label: "Ingredient evidence",
    description:
      "Whether the product's confirmed key actives address the concerns in question. Only ingredients high enough on the label to be present in quantity, and only ones that do something — a solvent is never evidence, however relevant the concerns it lists.",
    kind: "axis",
  },
  {
    key: "climateFit",
    label: "Climate tag fit",
    description:
      "Whether the product's coarse climate tags — humid, dry, cold, high UV, polluted — match the conditions derived from this person's recorded location.",
    kind: "axis",
  },
  {
    key: "climateBandFit",
    label: "Climate band fit",
    description:
      "Whether the product's suitable humidity, temperature and UV bands match this person's measured bands. Finer than the tags above: a tag says the product suits humid climates, a band says it suits high humidity specifically.",
    kind: "axis",
  },
  {
    key: "benefitAlignment",
    label: "Benefit alignment",
    description:
      "How far the product's claimed cosmetic benefits overlap the goals this person set during onboarding.",
    kind: "axis",
  },
  {
    key: "doshaAffinity",
    label: "Dosha affinity",
    description:
      "Whether the product's ingredients carry an affinity for this person's cosmetic Ayurvedic lean. Wellness guidance only — never a constitutional or medical claim.",
    kind: "axis",
  },
  {
    key: "completenessFloor",
    label: "Completeness floor",
    description:
      "What a product with no recorded intelligence keeps of the score it earned, as a fraction. Data quality scales a match rather than creating one: a thoroughly documented moisturiser is not a better answer to blemishes than a sparsely documented cleanser. At 1 the engine ignores completeness entirely.",
    kind: "multiplier",
  },
  {
    key: "unconfirmedFactor",
    label: "Unconfirmed data factor",
    description:
      "What a product whose intelligence nobody has confirmed keeps of its score, as a fraction. At 1 confirmed and unconfirmed products are treated alike; lower it to make human verification count for something.",
    kind: "multiplier",
  },
]

/**
 * Bounds the form enforces, mirroring the server schema.
 *
 * Mirrored deliberately rather than shared: these exist so the control cannot
 * produce an invalid value in the first place, and the server refuses one
 * regardless of what the browser sends.
 */
export const WEIGHT_BOUNDS: Record<
  keyof ScoringWeights,
  { min: number; max: number; step: number }
> = {
  concernMatch: { min: 0, max: 100, step: 1 },
  skinTypeFit: { min: 0, max: 100, step: 1 },
  climateFit: { min: 0, max: 100, step: 1 },
  climateBandFit: { min: 0, max: 100, step: 1 },
  ingredientEvidence: { min: 0, max: 100, step: 1 },
  benefitAlignment: { min: 0, max: 100, step: 1 },
  doshaAffinity: { min: 0, max: 100, step: 1 },
  completenessFloor: { min: 0, max: 1, step: 0.05 },
  unconfirmedFactor: { min: 0, max: 1, step: 0.05 },
}
