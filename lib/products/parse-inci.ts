export type ParsedInci = {
  raw: string
  items: string[]
  isLikelyInciList: boolean
}

const NOT_SPECIFIED_PATTERN = /not\s+specified/i

const MARKETING_MARKERS = [
  /\bfeatures:/i,
  /\bkills\s+\d/i,
  /\bhow to use:/i,
  /\bkey ingredients?:/i,
  /\bsuggested\s/i,
  /\brinse-free\b/i,
  /\bclinically proven\b/i,
  /\d+%\s+of\s+harmful/i,
] as const

const MARKETING_ONLY_PATTERN =
  /^(?:clinically proven|key ingredient|not specified|sandal:\s*extraction)/i

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

/** Cut marketing tails before comma-splitting INCI tokens. */
export function stripMarketingTail(raw: string): string {
  let text = collapseWhitespace(raw)

  for (const marker of MARKETING_MARKERS) {
    const match = marker.exec(text)
    if (match && match.index !== undefined && match.index > 0) {
      text = text.slice(0, match.index).trim()
    }
  }

  return text.replace(/^\(v\/v\)\s*purpose\s+/i, "").trim()
}

/** Split comma-separated INCI tokens, respecting parentheses. */
export function splitInciTokens(text: string): string[] {
  const items: string[] = []
  let current = ""
  let depth = 0

  for (const char of text) {
    if (char === "(") {
      depth += 1
      current += char
      continue
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }

    if (char === "," && depth === 0) {
      const token = collapseWhitespace(current)
      if (token) {
        items.push(token)
      }
      current = ""
      continue
    }

    current += char
  }

  const token = collapseWhitespace(current)
  if (token) {
    items.push(token)
  }

  return items
}

function containsMarketingBlob(raw: string): boolean {
  if (NOT_SPECIFIED_PATTERN.test(raw)) {
    return true
  }

  if (MARKETING_ONLY_PATTERN.test(raw.trim())) {
    return true
  }

  return MARKETING_MARKERS.some((marker) => marker.test(raw))
}

function looksLikeInciToken(token: string): boolean {
  if (token.length < 2) {
    return false
  }

  if (/^(and|or|the|with|for|to)\b/i.test(token)) {
    return false
  }

  if (/[–—]/.test(token)) {
    return false
  }

  if (
    /\b(nourishes|delivers|locks|boost|proven|soothes|intensive|hydration)\b/i.test(
      token,
    )
  ) {
    return false
  }

  if (/\d+%/.test(token) && !/[A-Za-z]/.test(token.replace(/\d+%/g, ""))) {
    return false
  }

  return /[A-Za-z]/.test(token)
}

function isLikelyInciList(raw: string, items: string[]): boolean {
  if (!raw.trim() || NOT_SPECIFIED_PATTERN.test(raw)) {
    return false
  }

  if (items.length === 0) {
    return false
  }

  if (items.length === 1) {
    if (containsMarketingBlob(raw)) {
      return false
    }

    return looksLikeInciToken(items[0])
  }

  const validTokens = items.filter(looksLikeInciToken)
  return validTokens.length >= 2
}

export function parseInciList(
  raw: string | null | undefined,
): ParsedInci {
  const source = raw?.trim() ?? ""

  if (!source || NOT_SPECIFIED_PATTERN.test(source)) {
    return { raw: source, items: [], isLikelyInciList: false }
  }

  if (/\bclinically proven\b/i.test(source)) {
    return { raw: source, items: [], isLikelyInciList: false }
  }

  const cleaned = stripMarketingTail(source)
  const items = splitInciTokens(cleaned)

  return {
    raw: source,
    items,
    isLikelyInciList: isLikelyInciList(source, items),
  }
}

export function resolveIngredientList(
  ingredientList: string[] | null | undefined,
  ingredients: string | null | undefined,
): string[] {
  if (ingredientList && ingredientList.length > 0) {
    return ingredientList
  }

  const parsed = parseInciList(ingredients)
  return parsed.isLikelyInciList ? parsed.items : []
}
