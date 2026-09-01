import {
  CHAT_REFUSAL_MESSAGE,
} from "@/lib/ai/prompts/chat"
import {
  classifyChatInput,
  type ChatHistoryMessage,
} from "@/lib/ai/providers/gemini-chat"
import type { MappedGeminiUsage } from "@/lib/ai/providers/gemini-usage"
import { MAX_CHAT_MESSAGE_LENGTH } from "@/lib/scans/constants"

export type GuardrailUsage = {
  usage: MappedGeminiUsage
  latencyMs: number
}

export type GuardrailResult =
  | { allowed: true; classifierUsage?: GuardrailUsage }
  | { allowed: false; reason: string; classifierUsage?: GuardrailUsage }

const BLOCKLIST_PATTERNS: RegExp[] = [
  /\b(write|generate|debug|fix)\s+(me\s+)?(code|script|program|sql|python|javascript)\b/i,
  /\b(homework|essay|assignment|thesis)\b/i,
  /\b(president|election|politics|war|religion)\b/i,
  /\b(bitcoin|crypto|stock|invest)\b/i,
  /\b(pretend|roleplay|ignore previous|jailbreak|dan mode)\b/i,
  /\b(diagnos(e|is|tic)|prescri(be|ption)|antibiotic|steroid cream for)\b/i,
  /\b(cancer|melanoma|eczema diagnosis|psoriasis treatment|rosacea cure)\b/i,
  /\b(suicid|self.?harm|depression medication)\b/i,
  /\b(pregnant|pregnancy safe drug)\b/i,
]

/**
 * Assistant output that must never ship, regardless of how it was prompted.
 *
 * These are deliberately narrow. Earlier versions matched any mention of
 * "melanoma", "steroid" or "prescription", which destroyed correct replies
 * such as "this scan does not screen for melanoma, please see a dermatologist"
 * and "we can't advise on prescription treatments". The rule is assertion, not
 * mention: the model may name a clinical term while declining, but may not
 * assert a diagnosis or direct the user onto a medication.
 */
export const MEDICAL_OUTPUT_PATTERNS: RegExp[] = [
  // Asserting the user has a named clinical condition.
  /\b(you|your skin)\s+(have|has|likely\s+ha(?:ve|s)|appear[s]?\s+to\s+have|are\s+showing\s+signs\s+of)\s+[\w\s-]{0,24}\b(disease|disorder|condition|infection|melanoma|carcinoma|eczema|psoriasis|rosacea|dermatitis)\b/i,
  /\b(you|this)\s+(are|is)\s+diagnosed\s+with\b/i,
  /\b(?:this|that|it)\s+(?:is|looks\s+like|appears\s+to\s+be)\s+(?:a\s+|an\s+)?(?:case\s+of\s+)?(melanoma|carcinoma|basal\s+cell|squamous\s+cell|psoriasis|eczema|rosacea|dermatitis|fungal\s+infection)\b/i,
  // Directing the user onto medication.
  /\b(i|we)\s+(recommend|suggest|advise)\s+(?:that\s+)?(?:you\s+)?(?:take|start|use|apply)\s+[\w\s-]{0,24}\b(antibiotic|steroid|corticosteroid|medication|prescription)\b/i,
  /\b(you\s+should|you\s+need\s+to|start)\s+(taking|applying)\s+[\w\s-]{0,24}\b(antibiotic|steroid|corticosteroid)\b/i,
  // Prescription-only actives a cosmetic assistant must not put in a routine.
  /\b(tretinoin|isotretinoin|accutane|tazarotene|hydroquinone|clindamycin|spironolactone|mupirocin|fluocinonide|triamcinolone)\b/i,
]

// "aura" is kept alongside "aurora": the product was called Aura, people who
// used it then still greet it that way, and dropping the old name would start
// classifying "hi aura" as off-topic rather than as a greeting.
const GREETING_PATTERN =
  /^(hi|hello|hey|howdy|yo|sup|greetings|good\s+(morning|afternoon|evening|day)|what'?s\s+up)(?:\s+(there|aurora|aura))?[!.?]*$/i

const SOCIAL_ACK_PATTERN =
  /^(thanks?|thank\s+you|thx|ty|ok|okay|got\s+it|cool|sounds\s+good|great|nice|perfect)[!.?]*$/i

/** Short greetings and social openers that should never be classified as off-topic. */
export function isConversationalOpener(message: string): boolean {
  const normalized = message.trim()
  if (!normalized) {
    return false
  }
  return (
    GREETING_PATTERN.test(normalized) || SOCIAL_ACK_PATTERN.test(normalized)
  )
}

export function checkInputGuardrails(
  message: string,
  options?: { hasImage?: boolean },
): GuardrailResult {
  const trimmed = message.trim()
  if (!trimmed && !options?.hasImage) {
    return { allowed: false, reason: "Message cannot be empty." }
  }
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      allowed: false,
      reason: `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`,
    }
  }

  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: "Off-topic or restricted request." }
    }
  }

  return { allowed: true }
}

export function sanitizeAssistantOutput(text: string): string {
  for (const pattern of MEDICAL_OUTPUT_PATTERNS) {
    if (pattern.test(text)) {
      return CHAT_REFUSAL_MESSAGE
    }
  }
  return text
}

export async function runFullInputGuardrails(
  message: string,
  modelId: string,
  hasScanContext: boolean,
  options?: { hasImage?: boolean; history?: ChatHistoryMessage[] },
): Promise<GuardrailResult> {
  const local = checkInputGuardrails(message, options)
  if (!local.allowed) {
    return local
  }

  // Established chats already have model context + local blocklist; classifying
  // isolated follow-ups like "thanks" or "that's good" causes false refusals.
  if ((options?.history?.length ?? 0) > 0) {
    return { allowed: true }
  }

  // First-message greetings ("hi", "hello") are valid chat openers, not off-topic.
  if (isConversationalOpener(message)) {
    return { allowed: true }
  }

  const messageForClassifier =
    message.trim() ||
    (options?.hasImage
      ? "User shared a cosmetic skin photo for advice."
      : "")

  const classification = await classifyChatInput(
    messageForClassifier,
    modelId,
    hasScanContext,
  )
  const classifierUsage = classification.usage
    ? {
        usage: classification.usage,
        latencyMs: classification.latencyMs ?? 0,
      }
    : undefined

  if (!classification.allowed) {
    return {
      allowed: false,
      reason: classification.refusalReason ?? "Off-topic request.",
      classifierUsage,
    }
  }

  return { allowed: true, classifierUsage }
}
