/**
 * The verdicts a person may give one recommendation.
 *
 * Its own module because the server action file carries "use server", which
 * permits only async function exports — a shared constant cannot live there,
 * and both the action and the query that reads it back need this list.
 *
 * `already_use` is separate from `helpful` throughout: it says the engine
 * agreed with a choice the person had already made, which is corroboration
 * rather than a suggestion they acted on. Counting the two together would
 * overstate how often the engine told anybody something new.
 */
export const RECOMMENDATION_VERDICTS = [
  "helpful",
  "not_relevant",
  "already_use",
  "did_not_suit",
] as const

export type RecommendationVerdictValue =
  (typeof RECOMMENDATION_VERDICTS)[number]
