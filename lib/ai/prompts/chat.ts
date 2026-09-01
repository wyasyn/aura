import type {
  CatalogProductContext,
  ScanHistoryContextItem,
  UserScanContext,
} from "@/lib/ai/types"
import { buildProfileConcernPromptBlock } from "@/lib/ai/context/concern-guidance"
import type { ScanClimateContext, SkinAssessment } from "@/lib/scan/types"
import { SKIN_DIMENSIONS } from "@/lib/scan/dimensions"

/**
 * The chat reply prompt.
 *
 * This asks for prose and nothing else. Structured recommendation cards come
 * from a separate constrained-decoding call (see buildRecommendationsPrompt),
 * because asking one call to write prose *and* hand-author a fenced JSON block
 * meant the two drifted constantly and the app had to strip prose that
 * duplicated the cards.
 */
const COSMETIC_RULES = `You are the Aurora Organics skin assistant, a cosmetic skin wellness guide.

You provide cosmetic and wellness guidance only. You are not a medical professional. Never diagnose and never name a clinical condition as a finding. If the user asks about medical symptoms, diagnoses, prescriptions, or anything outside skin wellness, decline warmly in a sentence and point them to a dermatologist.

SCOPE
Routines, products, lifestyle habits, climate-aware care, the Ayurvedic dosha lean, and explaining scan results. Nothing else.

GROUNDING
Reference the user's stated concerns and goals, and describe patterns visible in their scan results or photo even when those are not in their profile. Never invent numeric scores, percentages, or certainty you do not have.

RECOMMENDING
Lead with natural, organic, and lifestyle guidance. Products come after, and only when they genuinely help. Suggest products only from the supplied Aurora catalog, reasoning from a product's ingredientList when it has one and its ingredients text otherwise, informed by the personalized actives in context. Never suggest a product whose ingredientList contains anything in profile.allergies.

FORMAT
Write markdown. Use headings for sections (## Morning Routine). Use numbered lists for ordered routines, putting the step title on the numbered line with detail underneath, and indented hyphen bullets only for true sub-points. Break up long paragraphs. When you name a catalog product in prose, link it as [Product Name](purchaseUrl) using the exact purchaseUrl from the catalog JSON.

If you write a section of everyday habits, title it exactly "## Everyday Care". If you write a section of product suggestions, title it exactly "## Recommended Products". The app renders those two as cards, so it needs to recognise them.

Keep replies concise and supportive. Do not append disclaimers. When the user greets you or sends a short acknowledgment, reply warmly, use what you already know about them, and offer a useful next step.

When a concern sounds persistent or clinical, put the dermatologist referral on its own final line, for example "For persistent skin concerns, we always recommend consulting a qualified dermatologist." The app renders a booking button from that line, so do not add booking links yourself.`

export function buildAdviceSystemPrompt(hasScanHistory: boolean): string {
  const scanGuidance = hasScanHistory
    ? "Use the user's profile, location, and scan history below for personalized cosmetic guidance. Reference past scan bands and trends when relevant."
    : "The user has no scan history yet. Offer general cosmetic skin wellness guidance based on their profile and concerns. Encourage them to run a scan for personalized band-based assessment when relevant."

  return `${COSMETIC_RULES}

${scanGuidance}`
}

export function buildFollowUpSystemPrompt(): string {
  return `${COSMETIC_RULES}

The user completed a skin scan. Use the current scan assessment context below to answer follow-up questions. Reference previous scans when comparing trends or answering history questions.`
}

export function buildScanHistoryContextText(
  history: ScanHistoryContextItem[],
  options: { label?: string } = {},
): string {
  const label = options.label ?? "Recent scan history"
  if (history.length === 0) {
    return `${label}: No completed scans on file.`
  }

  return `${label} (JSON):
${JSON.stringify(history, null, 2)}`
}

export function buildAdviceContextText(
  userContext: UserScanContext,
  catalog: CatalogProductContext[],
  scanHistory: ScanHistoryContextItem[],
  activeClimateTags: string[] = [],
): string {
  const profileBlock = userContext.profile
    ? JSON.stringify(userContext.profile, null, 2)
    : "No profile on file."
  const locationBlock = userContext.location
    ? JSON.stringify(userContext.location, null, 2)
    : "No location on file."
  const climateTagsBlock =
    activeClimateTags.length > 0
      ? activeClimateTags.join(", ")
      : "No active climate tags."
  const catalogBlock = JSON.stringify(catalog, null, 2)
  const historyBlock = buildScanHistoryContextText(scanHistory)
  const concernBlock = buildProfileConcernPromptBlock(userContext.profile)

  return `User profile (JSON):
${profileBlock}

User location and climate (JSON):
${locationBlock}

Active climate tags:
${climateTagsBlock}

${historyBlock}

${concernBlock}

Aurora product catalog (JSON):
${catalogBlock}`
}

export function buildFollowUpContextText(
  userContext: UserScanContext,
  catalog: CatalogProductContext[],
  assessment: SkinAssessment,
  climateContext: ScanClimateContext | null,
  scanHistory: ScanHistoryContextItem[],
  activeClimateTags: string[] = [],
): string {
  const dimensionList = SKIN_DIMENSIONS.map(
    (d) => `${d.id}: ${d.label}`,
  ).join(", ")

  const assessmentBlock = JSON.stringify(
    {
      overallBand: assessment.overallBand,
      summary: assessment.summary,
      concernsNotVisible: assessment.concernsNotVisible,
      dimensions: assessment.dimensions,
      doshaTyping: assessment.doshaTyping,
      naturalRecommendations: assessment.naturalRecommendations,
      recommendations: assessment.recommendations,
    },
    null,
    2,
  )

  const climateBlock = climateContext
    ? JSON.stringify(climateContext, null, 2)
    : "No climate context."

  const historyBlock = buildScanHistoryContextText(scanHistory, {
    label: "Previous scans",
  })

  return `${buildAdviceContextText(userContext, catalog, [], activeClimateTags)}

Current scan assessment (JSON):
${assessmentBlock}

Scan climate context (JSON):
${climateBlock}

${historyBlock}

Dimension ids for reference: ${dimensionList}`
}

/**
 * Prompt for the second, constrained call that turns a prose reply into card
 * payload. It reads only what the reply actually said: it must not introduce
 * habits or products the user was never told about.
 */
export function buildRecommendationsExtractionPrompt(
  userMessage: string,
  proseReply: string,
): string {
  return `You are extracting structured recommendation cards from a cosmetic skin assistant's reply. The cards render beside the reply, so they must reflect what the reply already said.

Rules:
- Extract only habits and products the reply actually put forward. Never introduce anything the reply did not mention.
- Set hasRecommendations to false, with both arrays empty, when the reply is a greeting, an acknowledgment, an explanation, a clarifying question, or a refusal. Most replies are in this group.
- Product ids must be exact slugs from the catalog in your context. Drop any product you cannot match to a slug.
- Do not include a product whose ingredientList conflicts with the user's stated allergies.
- Choose applicationTime and applicationFrequency from what the reply says. When the reply is silent, use the sensible default for that kind of item.

The user asked:
"""
${userMessage}
"""

The assistant replied:
"""
${proseReply}
"""

Return the structured extraction only.`
}

export const CHAT_REFUSAL_MESSAGE =
  "I can only help with cosmetic skin wellness — routines, products, and your scan results. For medical concerns, please see a dermatologist."
