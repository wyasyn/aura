export type SplitChatDisclaimerResult = {
  body: string
  disclaimer: string | null
  consultationNote: string | null
}

const DISCLAIMER_PARAGRAPH_PATTERNS = [
  /^please note:/i,
  /^disclaimer:/i,
  /^important:/i,
  /^remember:/i,
  /not a medical professional/i,
  /not a medical diagnosis/i,
  /not medical advice/i,
  /cosmetic (and )?lifestyle guidance/i,
  /treatment plan for clinical/i,
  /for clinical concerns/i,
  /licensed healthcare professional/i,
  /this is (for )?cosmetic (and wellness )?guidance only/i,
  /for cosmetic purposes only/i,
  /cosmetic purposes only/i,
  /our guidance is for cosmetic/i,
  /guidance is for cosmetic/i,
]

const CONSULTATION_NOTE_PATTERNS = [
  /recommend\s+consulting\s+(?:a\s+)?(?:qualified\s+)?dermatologist/i,
  /always\s+recommend\s+consulting/i,
  /see\s+a\s+(?:licensed\s+)?(?:dermatologist|healthcare professional)/i,
  /persistent\s+skin\s+concerns/i,
  /book\s+a\s+consultation/i,
]

function isDisclaimerParagraph(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) {
    return false
  }

  return DISCLAIMER_PARAGRAPH_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  )
}

function isConsultationNoteParagraph(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) {
    return false
  }

  return CONSULTATION_NOTE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function splitInlineDisclaimer(paragraph: string): {
  body: string
  disclaimer: string | null
} {
  const match = paragraph.match(/^(.*?)(?:\n\s*)?(Please note:[\s\S]+)$/i)
  if (!match) {
    return { body: paragraph, disclaimer: null }
  }

  const body = match[1].trim()
  const disclaimer = match[2].trim()
  if (!body) {
    return { body: "", disclaimer }
  }

  return { body, disclaimer }
}

function splitTrailingConsultationNote(paragraph: string): {
  body: string
  consultationNote: string | null
} {
  const match = paragraph.match(
    /^(.*?)((?:For persistent skin concerns|We always recommend consulting)[\s\S]+)$/i,
  )
  if (!match) {
    return { body: paragraph, consultationNote: null }
  }

  const body = match[1].trim()
  const consultationNote = match[2].trim()
  if (!body) {
    return { body: "", consultationNote }
  }

  return { body, consultationNote }
}

function normalizeDisclaimer(parts: string[]): string | null {
  const unique = [...new Set(parts.map((part) => part.trim()).filter(Boolean))]
  if (unique.length === 0) {
    return null
  }
  return unique.join(" ")
}

/**
 * Pulls cosmetic disclaimer paragraphs out of assistant prose so they can
 * render in a dedicated footer slot instead of mid-message.
 */
export function splitChatDisclaimer(content: string): SplitChatDisclaimerResult {
  const trimmed = content.trim()
  if (!trimmed) {
    return { body: "", disclaimer: null, consultationNote: null }
  }

  const paragraphs = trimmed.split(/\n{2,}/)
  const bodyParts: string[] = []
  const disclaimerParts: string[] = []
  const consultationParts: string[] = []

  for (const paragraph of paragraphs) {
    const block = paragraph.trim()
    if (!block) {
      continue
    }

    if (isDisclaimerParagraph(block)) {
      disclaimerParts.push(block)
      continue
    }

    if (isConsultationNoteParagraph(block)) {
      consultationParts.push(block)
      continue
    }

    const { body, disclaimer } = splitInlineDisclaimer(block)
    const trailingConsultation = splitTrailingConsultationNote(body)
    if (trailingConsultation.consultationNote) {
      if (trailingConsultation.body) {
        bodyParts.push(trailingConsultation.body)
      }
      consultationParts.push(trailingConsultation.consultationNote)
    } else if (body) {
      if (isConsultationNoteParagraph(body)) {
        consultationParts.push(body)
      } else {
        bodyParts.push(body)
      }
    }
    if (disclaimer) {
      disclaimerParts.push(disclaimer)
    }
  }

  return {
    body: bodyParts.join("\n\n").trim(),
    disclaimer: normalizeDisclaimer(disclaimerParts),
    consultationNote: normalizeDisclaimer(consultationParts),
  }
}
