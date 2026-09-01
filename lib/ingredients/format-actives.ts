import type { RecommendedActive } from "@/lib/ingredients/types"

export function formatRecommendedActivesForPrompt(
  actives: RecommendedActive[],
): string {
  if (actives.length === 0) {
    return "No structured ingredient actives matched."
  }

  return actives
    .map(
      (active) =>
        `- ${active.displayName} (${active.inciName}): ${active.reasons.join("; ")}`,
    )
    .join("\n")
}
