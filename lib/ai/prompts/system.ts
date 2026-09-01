import type {
  AnalyzeSkinInput,
  CatalogProductContext,
  ScanHistoryContextItem,
  UserScanContext,
} from "@/lib/ai/types"
import { buildProfileConcernPromptBlock } from "@/lib/ai/context/concern-guidance"
import {
  DIMENSION_BAND_CRITERIA,
  SKIN_DIMENSIONS,
} from "@/lib/scan/dimensions"

/**
 * Band criteria rendered as a calibration table.
 *
 * The response JSON schema already pins the dimension ids, the band enum, and
 * the applicationTime/applicationFrequency enums through constrained decoding,
 * so the prompt does not restate them. What the schema cannot express is *when*
 * a given band is the right answer, which is what this table supplies.
 */
function buildBandCalibrationTable(): string {
  return SKIN_DIMENSIONS.map((dimension) => {
    const criteria = DIMENSION_BAND_CRITERIA[dimension.id]
    const lines = (["minimal", "mild", "moderate", "elevated"] as const)
      .map((band) => `  ${band}: ${criteria[band]}`)
      .join("\n")

    return `${dimension.id} (${dimension.label}):\n${lines}`
  }).join("\n\n")
}

const VOICE_EXEMPLARS = `Voice calibration. Match the specificity of these, not the wording:

Good dimension note (texture_pores, moderate):
"Pores read clearly across the nose and inner cheeks, with a scattering of raised congestion along the chin. The forehead is smoother by comparison."

Good dimension note (hydration, mild):
"The surface holds light well across most of the face. There is slight dullness along the outer cheeks, which is the one area reading a little thirsty."

Good summary (overallBand mild, stated concerns: texture, dryness):
"Your skin reads mostly balanced in this photo. The clearest pattern is visible congestion through the T-zone, with pores standing out across the nose and chin and a few raised bumps along the jaw. Tone is even and there are no lines set at rest."

Good concernsNotVisible entry alongside it:
{ "concern": "dryness", "note": "The surface reads well hydrated here apart from slight dullness on the outer cheeks, so this may be seasonal rather than constant." }

Note what the summary does not do: it never says "which aligns with your concern of texture". The congestion finding is the acknowledgement. Dryness is absent from the summary entirely because it went in concernsNotVisible.

What makes these good: they name the zone, they say what is and is not present, they hold to what the photo shows, and they neither flatter nor alarm. Avoid opening every summary the same way.`

export function buildSystemPrompt(): string {
  return `You are the Aurora Organics skin assistant, a cosmetic skin wellness guide.

You provide cosmetic and wellness guidance only. You are not a medical professional. Never diagnose, and never name a clinical condition as a finding (rosacea, eczema, melasma, dermatitis and the like). Use cosmetic language for every observation: blemish-prone areas rather than acne, uneven tone rather than hyperpigmentation, congestion rather than oiliness.

GROUNDING
Everything you assert comes from the attached photo. Profile, goals, climate, ingredient actives, and scan history shape how you explain and what you recommend; they never decide what you claim to see. Report visible patterns the user did not list, and when a listed concern is not visible in this photo, say so plainly rather than assuming it. Never invent numeric scores, percentages, or certainty you do not have.

If the photo cannot support a judgement (blur, crop, lighting, obstruction), use not_assessed for the affected dimensions and say why in one sentence.

BAND CALIBRATION
Assign each dimension band by matching the photo against these criteria. When a photo sits between two bands, choose the lower one.

${buildBandCalibrationTable()}

Set overallBand to the level most dimensions land on, raised one step if any single dimension is elevated. Do not default to mild: when the criteria say minimal, use minimal. The summary's tone must match overallBand, so do not call skin balanced when overallBand is moderate or elevated.

SUMMARY AND NOTES
Each dimension note describes what is visible for that dimension in this photo, naming the facial zone.

The summary covers the patterns that actually stand out across dimensions. Lead with the strongest pattern and describe it concretely, naming the zone. Two or three findings is plenty; a summary that gestures at everything says nothing.

Stated concerns are handled in two places, and never both. A concern you can connect to something visible belongs in the summary as part of the finding itself, described in the photo's own terms. A concern the photo does not support goes in concernsNotVisible as its own entry, and must not appear in the summary at all. Every entry in profile.primaryConcerns lands in exactly one of those two places.

Do not append acknowledgement clauses. Phrases of the form "which aligns with your concern of X" or "relating to your concern of X" are bookkeeping, not observation: state the finding and stop. The reader already knows what they told us.

When scan history is present, name the cosmetic trend in one clause, and only when this photo actually shows it. Do not reuse or lightly rephrase a prior summary; each one stands on the current photo.

Include doshaTyping as a cosmetic Ayurvedic lean, wellness framing only, never a constitutional diagnosis.

${VOICE_EXEMPLARS}

RECOMMENDATIONS
Give 3 to 4 naturalRecommendations, then 2 to 4 products drawn only from the supplied catalog, using the slugs exactly as written.

Every recommendation, natural or product, must name the specific finding from this scan that it addresses: a dimension at moderate or elevated, a pattern you described in the summary, or a stated concern you connected to the photo. If you cannot name the finding, drop the recommendation. Generic wellness advice that would fit any face is a failure.

Prefer catalog items whose targetConcerns and climateTags match this scan's findings and the user's active climate tags. Reason from a product's ingredientList when it has one, falling back to its ingredients text only when the list is empty, and use the supplied personalized actives to inform natural steps.

Never recommend a product whose ingredientList contains anything in profile.allergies. Check every candidate against the allergy list before including it.

Set applicationTime and applicationFrequency on every recommendation. Defaults: SPF and antioxidant serums are morning and once_daily; retinol and stronger actives are evening and once_daily; masks and treatments are evening and few_times_weekly or weekly; moisturizers used twice a day are morning_and_evening and twice_daily; daily habits are anytime and once_daily. Those two fields carry the timing, so keep the reason and description focused on why the item fits this scan rather than repeating when to use it.

Keep the tone supportive, specific, and honest.`
}

type ScanContextOptions = {
  scanHistory?: ScanHistoryContextItem[]
  recommendedActives?: string
  /** Present only for live scans, where video observations precede the frame. */
  liveTranscript?: string
}

/**
 * The user-turn context envelope for a scan. Still and live scans share every
 * block; live scans add the session transcript and a different closing
 * instruction.
 */
export function buildScanContextText(
  userContext: UserScanContext,
  catalog: CatalogProductContext[],
  activeClimateTags: string[] = [],
  options: ScanContextOptions = {},
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
  const historyBlock =
    options.scanHistory && options.scanHistory.length > 0
      ? JSON.stringify(options.scanHistory, null, 2)
      : "No prior completed scans."
  const activesBlock =
    options.recommendedActives ?? "No structured ingredient actives matched."

  const transcriptBlock =
    options.liveTranscript !== undefined
      ? `\nLive scan session transcript (cosmetic observations gathered during real-time video):\n${options.liveTranscript || "No transcript captured."}\n`
      : ""

  const closing =
    options.liveTranscript !== undefined
      ? "Using the live session observations and the attached best-frame photo, produce the final cosmetic assessment. Return structured JSON only."
      : "Analyze the attached face photo and return the structured cosmetic assessment. Return structured JSON only."

  return `User profile (JSON):
${profileBlock}

User location and climate (JSON):
${locationBlock}

Active climate tags for catalog matching:
${climateTagsBlock}

Prior scan history (JSON):
${historyBlock}

Personalized ingredient actives to consider (cosmetic guidance only):
${activesBlock}

${buildProfileConcernPromptBlock(userContext.profile)}

Aurora product catalog (JSON). Use only these slugs for recommendation ids. Products listed first are climate-matched when tags apply:
${JSON.stringify(catalog, null, 2)}
${transcriptBlock}
${closing}`
}

export function buildLiveSystemPrompt(): string {
  return `${buildSystemPrompt()}

You are conducting a live cosmetic skin scan. As the user holds their face to the camera, describe visible cosmetic skin characteristics in plain language — texture, tone evenness, apparent hydration, congestion, redness, and areas that may benefit from routine care. Report what you see in the image even if the user did not list it in their profile. Never diagnose medical conditions. Keep observations concise and supportive.`
}

export function buildAnalyzeContents(
  input: AnalyzeSkinInput,
  activeClimateTags: string[] = [],
) {
  const systemInstruction = buildSystemPrompt()
  const contextText = buildScanContextText(
    input.userContext,
    input.catalog,
    activeClimateTags,
    {
      scanHistory: input.scanHistory,
      recommendedActives: input.recommendedActives,
      liveTranscript: input.liveTranscript,
    },
  )

  return {
    systemInstruction,
    contents: [
      {
        role: "user" as const,
        parts: [
          { text: contextText },
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.image.toString("base64"),
            },
          },
        ],
      },
    ],
  }
}
