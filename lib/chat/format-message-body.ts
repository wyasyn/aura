import { stripJsonFence } from "@/lib/chat/extract-recommendations"
import { splitChatDisclaimer } from "@/lib/chat/split-disclaimer"
import type { ChatMessageMetadata } from "@/lib/chat/types"

const NATURAL_SECTION_HEADING =
  /^#{1,6}\s*(?:Natural|Lifestyle|Everyday)(?:\s|&).*$/i

const PRODUCT_SECTION_HEADING =
  /^#{1,6}\s*(?:Recommended\s+)?(?:Aurora\s+)?Products?\b.*$/i

/** Shortest normalized title we trust for a containment match. */
const MIN_TARGET_LENGTH = 6

type RecommendationProseOptions = Pick<
  ChatMessageMetadata,
  "naturalRecommendations" | "productRecommendations"
>

type UnitKind = "heading" | "hr" | "item" | "paragraph"

type Unit = {
  kind: UnitKind
  lines: string[]
}

/**
 * Reduce markdown to comparable words: link text only, no emphasis marks, no
 * list markers, no punctuation.
 */
function normalizeText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, " ")
    .replace(/[#*_`~]/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isHrLine(trimmed: string): boolean {
  return /^-{3,}$/.test(trimmed)
}

function isBulletLine(trimmed: string): boolean {
  return /^[-*+]\s+/.test(trimmed)
}

function isNumberedLine(trimmed: string): boolean {
  return /^\d+[.)]\s+/.test(trimmed)
}

function isListLine(trimmed: string): boolean {
  return isBulletLine(trimmed) || isNumberedLine(trimmed)
}

/**
 * Heading detection mirrors parseMarkdownBlocks in chat-message-content.tsx so
 * both sides agree on what counts as a section title.
 */
function isHeadingLine(trimmed: string, nextTrimmed: string): boolean {
  if (/^#{1,6}\s+/.test(trimmed)) return true
  if (/^\*\*(.+)\*\*:?$/.test(trimmed)) return true

  return (
    !isListLine(trimmed) &&
    trimmed.length <= 80 &&
    !trimmed.endsWith(".") &&
    isListLine(nextTrimmed)
  )
}

/**
 * Group lines into headings, list items (with their indented detail lines),
 * paragraphs, and rules. Blank lines are dropped; spacing is rebuilt on output.
 */
function parseUnits(lines: string[]): Unit[] {
  const units: Unit[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (isHrLine(trimmed)) {
      units.push({ kind: "hr", lines: [line] })
      index += 1
      continue
    }

    const nextTrimmed = lines[index + 1]?.trim() ?? ""
    if (isHeadingLine(trimmed, nextTrimmed)) {
      units.push({ kind: "heading", lines: [line] })
      index += 1
      continue
    }

    if (isListLine(trimmed)) {
      const itemLines = [line]
      index += 1
      // Continuation lines belong to the item: indented, and not a new top
      // level item.
      while (index < lines.length) {
        const candidate = lines[index]
        const candidateTrimmed = candidate.trim()
        if (!candidateTrimmed) break
        if (isHrLine(candidateTrimmed)) break
        const isIndented = /^\s+/.test(candidate)
        if (!isIndented && isListLine(candidateTrimmed)) break
        if (!isIndented && /^#{1,6}\s+/.test(candidateTrimmed)) break
        itemLines.push(candidate)
        index += 1
      }
      units.push({ kind: "item", lines: itemLines })
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (index < lines.length) {
      const candidate = lines[index]
      const candidateTrimmed = candidate.trim()
      if (!candidateTrimmed) break
      if (isHrLine(candidateTrimmed)) break
      if (isListLine(candidateTrimmed)) break
      if (/^#{1,6}\s+/.test(candidateTrimmed)) break
      paragraphLines.push(candidate)
      index += 1
    }
    units.push({ kind: "paragraph", lines: paragraphLines })
  }

  return units
}

function buildTargets(options: RecommendationProseOptions): string[] {
  const raw = [
    ...(options.naturalRecommendations ?? []).map((item) => item.title),
    ...(options.productRecommendations ?? []).map((item) => item.name),
  ]

  const targets = new Set<string>()
  for (const value of raw) {
    const normalized = normalizeText(value ?? "")
    if (normalized.length >= MIN_TARGET_LENGTH) {
      targets.add(normalized)
    }
  }

  return [...targets]
}

function matchesTarget(text: string, targets: string[]): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false

  return targets.some(
    (target) =>
      normalized.includes(target) ||
      (normalized.length >= MIN_TARGET_LENGTH && target.includes(normalized)),
  )
}

function unitText(unit: Unit): string {
  return unit.lines.join(" ")
}

/**
 * When structured recommendation cards are shown, remove matching prose so
 * habits and products are not repeated in the bubble. Sections whose entire
 * body is removed lose their heading too.
 */
export function stripDuplicateRecommendationProse(
  body: string,
  options?: RecommendationProseOptions | null,
): string {
  const hasNatural = (options?.naturalRecommendations?.length ?? 0) > 0
  const hasProducts = (options?.productRecommendations?.length ?? 0) > 0

  if (!body.trim() || (!hasNatural && !hasProducts)) {
    return body
  }

  const targets = buildTargets(options ?? {})
  const units = parseUnits(body.replace(/\r\n/g, "\n").split("\n"))
  const dropped = new Array<boolean>(units.length).fill(false)

  // Pass 1: drop known recommendation sections wholesale, and any individual
  // unit that restates a structured title or product name.
  let sectionDropping = false
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i]
    const trimmed = unit.lines[0]?.trim() ?? ""

    if (unit.kind === "heading") {
      const isNaturalHeading = hasNatural && NATURAL_SECTION_HEADING.test(trimmed)
      const isProductHeading = hasProducts && PRODUCT_SECTION_HEADING.test(trimmed)
      sectionDropping = isNaturalHeading || isProductHeading
      if (sectionDropping || matchesTarget(trimmed, targets)) {
        dropped[i] = true
      }
      continue
    }

    if (unit.kind === "hr") {
      continue
    }

    if (sectionDropping || matchesTarget(unitText(unit), targets)) {
      dropped[i] = true
    }
  }

  // Pass 2: a heading whose list content all disappeared has nothing left to
  // title, so it goes too and any remaining prose stands on its own.
  for (let i = 0; i < units.length; i += 1) {
    if (units[i].kind !== "heading" || dropped[i]) continue

    let anyDropped = false
    let keptItem = false
    for (let j = i + 1; j < units.length; j += 1) {
      if (units[j].kind === "heading") break
      if (units[j].kind === "hr") continue
      if (dropped[j]) {
        anyDropped = true
        continue
      }
      if (units[j].kind === "item") {
        keptItem = true
        break
      }
    }

    if (anyDropped && !keptItem) {
      dropped[i] = true
    }
  }

  // Pass 3: a lead-in line ("Two things to start with:") is pointless once the
  // list it introduced is gone.
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i]
    if (unit.kind !== "paragraph" || dropped[i]) continue
    if (!unitText(unit).trim().endsWith(":")) continue

    let sawItem = false
    let keptItem = false
    for (let j = i + 1; j < units.length; j += 1) {
      if (units[j].kind !== "item") break
      sawItem = true
      if (!dropped[j]) {
        keptItem = true
        break
      }
    }

    if (sawItem && !keptItem) {
      dropped[i] = true
    }
  }

  const kept = units.filter((_, index) => !dropped[index])

  // Trailing/leading rules with nothing left to separate.
  while (kept.length > 0 && kept[0].kind === "hr") kept.shift()
  while (kept.length > 0 && kept[kept.length - 1].kind === "hr") kept.pop()

  let output = ""
  for (let i = 0; i < kept.length; i += 1) {
    const text = kept[i].lines.join("\n")
    if (i === 0) {
      output = text
      continue
    }
    // Keep consecutive list items in one list: a blank line between them would
    // split the list when the message is rendered.
    const separator =
      kept[i].kind === "item" && kept[i - 1].kind === "item" ? "\n" : "\n\n"
    output += separator + text
  }

  return output.replace(/\n{3,}/g, "\n\n").trim()
}

/** Strip fenced JSON, disclaimers, and duplicate recommendation prose for display. */
export function formatChatMessageBody(
  content: string,
  options?: RecommendationProseOptions | null,
): string {
  const withoutJson = stripJsonFence(content)
  const { body } = splitChatDisclaimer(withoutJson)
  return stripDuplicateRecommendationProse(body, options)
}
