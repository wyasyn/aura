/**
 * Substantiated capability claims for the landing page. Every entry maps to a
 * feature that actually ships, so this section can be verified against the
 * codebase rather than asserted. Do not add a claim here without the code
 * behind it.
 */
export type ProofVisualId =
  | "bands"
  | "lean"
  | "allergy"
  | "climate"
  | "privacy"
  | "chat"

export interface ProofPoint {
  visual: ProofVisualId
  title: string
  description: string
}

export const PROOF_POINTS: ProofPoint[] = [
  {
    visual: "bands",
    title: "Honest skin bands",
    description:
      "Hydration, tone, texture, and more as clear bands. Never fake percentages.",
  },
  {
    visual: "lean",
    title: "Ayurvedic lean",
    description:
      "A whole-skin dosha lean, so guidance sees the bigger picture.",
  },
  {
    visual: "allergy",
    title: "Allergy-safe matches",
    description:
      "Full ingredient lists checked against your profile before anything is recommended.",
  },
  {
    visual: "climate",
    title: "Climate-aware picks",
    description:
      "Matched to the humidity and conditions where you actually live.",
  },
  {
    visual: "privacy",
    title: "Photo never stored",
    description:
      "Analyzed, then discarded. You keep the report. We keep no image.",
  },
  {
    visual: "chat",
    title: "Ask follow-ups",
    description:
      "Voice or text answers grounded in your own scan results.",
  },
]

export const PROOF_SECTION = {
  badge: "What you get",
  heading: "Everything built into your scan",
  subheading:
    "No tiers to compare and nothing held back. Every scan runs the same checks and returns the same report.",
}
