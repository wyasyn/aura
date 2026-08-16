import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const INLINE_PATTERN =
  /(\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let matchIndex = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index))
    }

    const key = `${keyPrefix}-inline-${matchIndex}`
    matchIndex += 1

    if (match[2]) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {match[2]}
        </strong>,
      )
    } else if (match[3] || match[4]) {
      nodes.push(
        <em key={key} className="italic">
          {match[3] ?? match[4]}
        </em>,
      )
    } else if (match[5]) {
      nodes.push(
        <code
          key={key}
          className="rounded-sm bg-background/80 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {match[5]}
        </code>,
      )
    } else if (match[6] && match[7]) {
      nodes.push(
        <a
          key={key}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {match[6]}
        </a>,
      )
    }

    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}

function renderParagraph(text: string, key: string) {
  const lines = text.split("\n")
  return (
    <p key={key} className="whitespace-pre-wrap">
      {lines.map((line, lineIndex) => (
        <span key={`${key}-line-${lineIndex}`}>
          {lineIndex > 0 ? <br /> : null}
          {renderInline(line, `${key}-line-${lineIndex}`)}
        </span>
      ))}
    </p>
  )
}

const BULLET_MARKER = /^[-*+•]\s+/
const NUMBERED_MARKER = /^\d+[.)]\s+/
const NESTED_BULLET_MARKER = /^\s+[-*+•]\s+/

function stripBulletMarker(line: string): string {
  return line.trim().replace(/^[-*+•]\s+/, "")
}

function stripNumberedMarker(line: string): string {
  return line.trim().replace(/^\d+[.)]\s+/, "")
}

function isBulletLine(trimmed: string): boolean {
  return BULLET_MARKER.test(trimmed)
}

function isNumberedLine(trimmed: string): boolean {
  return NUMBERED_MARKER.test(trimmed)
}

type NumberedListItem = {
  title: string
  details: string[]
  subBullets: string[]
}

function parseNumberedListItems(
  lines: string[],
  startIndex: number,
): { items: NumberedListItem[]; nextIndex: number } {
  const items: NumberedListItem[] = []
  let index = startIndex

  while (index < lines.length) {
    const trimmed = lines[index].trim()
    if (!trimmed) {
      index += 1
      continue
    }
    if (!isNumberedLine(trimmed)) break

    const item: NumberedListItem = {
      title: stripNumberedMarker(trimmed),
      details: [],
      subBullets: [],
    }
    index += 1

    while (index < lines.length) {
      const nextTrimmed = lines[index].trim()
      if (!nextTrimmed) {
        index += 1
        continue
      }
      if (isNumberedLine(nextTrimmed)) break
      if (/^(#{1,3})\s+/.test(nextTrimmed)) break
      if (/^-{3,}$/.test(nextTrimmed)) break
      if (isBulletLine(nextTrimmed)) {
        item.subBullets.push(stripBulletMarker(nextTrimmed))
        index += 1
        continue
      }

      item.details.push(nextTrimmed)
      index += 1
    }

    items.push(item)
  }

  return { items, nextIndex: index }
}

function renderNumberedList(items: NumberedListItem[], blockIndex: number) {
  return (
    <ol
      key={`block-${blockIndex}`}
      className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-foreground"
    >
      {items.map((item, itemIndex) => (
        <li key={`block-${blockIndex}-item-${itemIndex}`} className="pl-1">
          <span className="font-medium text-foreground">
            {renderInline(item.title, `block-${blockIndex}-item-${itemIndex}-title`)}
          </span>
          {item.details.length > 0 ? (
            <div className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-muted-foreground">
              {item.details.map((detail, detailIndex) => (
                <p key={`block-${blockIndex}-item-${itemIndex}-detail-${detailIndex}`}>
                  {renderInline(
                    detail,
                    `block-${blockIndex}-item-${itemIndex}-detail-${detailIndex}`,
                  )}
                </p>
              ))}
            </div>
          ) : null}
          {item.subBullets.length > 0 ? (
            <ul
              className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground marker:text-muted-foreground/80"
              key={`block-${blockIndex}-item-${itemIndex}-sub`}
            >
              {item.subBullets.map((bullet, bulletIndex) => (
                <li
                  key={`block-${blockIndex}-item-${itemIndex}-sub-${bulletIndex}`}
                >
                  {renderInline(
                    bullet,
                    `block-${blockIndex}-item-${itemIndex}-sub-${bulletIndex}`,
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

type BulletListItem = {
  content: string
  children: string[]
}

function isStructuralLine(trimmed: string): boolean {
  return (
    /^-{3,}$/.test(trimmed) ||
    /^(#{1,3})\s+/.test(trimmed) ||
    isBulletLine(trimmed) ||
    isNumberedLine(trimmed) ||
    /^\*\*(.+)\*\*$/.test(trimmed)
  )
}

function tryParseTitleDetailList(
  lines: string[],
  startIndex: number,
): { items: BulletListItem[]; nextIndex: number } | null {
  const items: BulletListItem[] = []
  let index = startIndex

  while (index < lines.length) {
    const title = lines[index]?.trim() ?? ""
    if (!title) {
      index += 1
      continue
    }
    if (isStructuralLine(title)) break

    const detail = lines[index + 1]?.trim() ?? ""
    if (
      title.length <= 72 &&
      !title.endsWith(".") &&
      detail &&
      !isStructuralLine(detail)
    ) {
      items.push({ content: title, children: [detail] })
      index += 2
      continue
    }

    break
  }

  if (items.length < 2) {
    return null
  }

  return { items, nextIndex: index }
}

function parseBulletListItems(
  lines: string[],
  startIndex: number,
): { items: BulletListItem[]; nextIndex: number } {
  const items: BulletListItem[] = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index]
    if (NESTED_BULLET_MARKER.test(line)) break

    const topMatch = line.trim().match(/^[-*+•]\s+(.+)$/)
    if (!topMatch) break

    const item: BulletListItem = {
      content: topMatch[1].trim(),
      children: [],
    }
    index += 1

    while (index < lines.length) {
      const current = lines[index]
      const trimmed = current.trim()
      if (!trimmed) {
        index += 1
        continue
      }

      const nestedMatch = current.match(/^\s+[-*+•]\s+(.+)$/)
      if (nestedMatch) {
        item.children.push(nestedMatch[1].trim())
        index += 1
        continue
      }

      if (isBulletLine(trimmed)) break
      if (isNumberedLine(trimmed)) break
      if (/^(#{1,3})\s+/.test(trimmed)) break
      if (/^-{3,}$/.test(trimmed)) break

      item.children.push(trimmed)
      index += 1
    }

    items.push(item)
  }

  return { items, nextIndex: index }
}

function renderBulletList(items: BulletListItem[], blockIndex: number) {
  return (
    <ul
      key={`block-${blockIndex}`}
      className="list-disc space-y-2 pl-5 marker:text-foreground"
    >
      {items.map((item, itemIndex) => (
        <li key={`block-${blockIndex}-item-${itemIndex}`} className="pl-0.5">
          <span className="text-foreground">
            {renderInline(item.content, `block-${blockIndex}-item-${itemIndex}`)}
          </span>
          {item.children.length > 0 ? (
            <ul className="mt-1.5 list-[circle] space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground marker:text-muted-foreground/80">
              {item.children.map((child, childIndex) => (
                <li key={`block-${blockIndex}-item-${itemIndex}-child-${childIndex}`}>
                  {renderInline(
                    child,
                    `block-${blockIndex}-item-${itemIndex}-child-${childIndex}`,
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function parseMarkdownBlocks(content: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let index = 0
  let blockIndex = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (/^-{3,}$/.test(trimmed)) {
      blocks.push(
        <hr
          key={`block-${blockIndex}`}
          className="border-border/50"
        />,
      )
      blockIndex += 1
      index += 1
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const HeadingTag = level === 1 ? "h3" : level === 2 ? "h4" : "h5"
      blocks.push(
        <HeadingTag
          key={`block-${blockIndex}`}
          className={cn(
            "font-heading font-semibold text-foreground",
            level === 1 ? "text-sm" : "text-sm",
          )}
        >
          {renderInline(headingMatch[2], `block-${blockIndex}-heading`)}
        </HeadingTag>,
      )
      blockIndex += 1
      index += 1
      continue
    }

    const boldHeadingMatch = trimmed.match(/^\*\*(.+)\*\*$/)
    if (boldHeadingMatch) {
      blocks.push(
        <h4
          key={`block-${blockIndex}`}
          className="pt-1 font-heading text-sm font-semibold text-foreground"
        >
          {renderInline(boldHeadingMatch[1], `block-${blockIndex}-bold-heading`)}
        </h4>,
      )
      blockIndex += 1
      index += 1
      continue
    }

    const nextTrimmed = lines[index + 1]?.trim() ?? ""
    if (
      !isBulletLine(trimmed) &&
      !isNumberedLine(trimmed) &&
      !/^\*\*(.+)\*\*$/.test(trimmed) &&
      trimmed.length <= 80 &&
      !trimmed.endsWith(".") &&
      (isNumberedLine(nextTrimmed) || isBulletLine(nextTrimmed))
    ) {
      blocks.push(
        <h4
          key={`block-${blockIndex}`}
          className="pt-1 font-heading text-sm font-semibold text-foreground"
        >
          {renderInline(trimmed, `block-${blockIndex}-section`)}
        </h4>,
      )
      blockIndex += 1
      index += 1
      continue
    }

    if (isBulletLine(trimmed)) {
      const { items, nextIndex } = parseBulletListItems(lines, index)
      if (items.length > 0) {
        blocks.push(renderBulletList(items, blockIndex))
        blockIndex += 1
      }
      index = nextIndex
      continue
    }

    if (isNumberedLine(trimmed)) {
      const { items, nextIndex } = parseNumberedListItems(lines, index)
      if (items.length > 0) {
        blocks.push(renderNumberedList(items, blockIndex))
        blockIndex += 1
      }
      index = nextIndex
      continue
    }

    const paragraphLines: string[] = []
    const titleDetailList = tryParseTitleDetailList(lines, index)
    if (titleDetailList) {
      blocks.push(renderBulletList(titleDetailList.items, blockIndex))
      blockIndex += 1
      index = titleDetailList.nextIndex
      continue
    }

    while (index < lines.length) {
      const current = lines[index]
      const currentTrimmed = current.trim()
      if (!currentTrimmed) break
      if (
        /^-{3,}$/.test(currentTrimmed) ||
        /^(#{1,3})\s+/.test(currentTrimmed) ||
        /^\*\*(.+)\*\*$/.test(currentTrimmed) ||
        isBulletLine(currentTrimmed) ||
        isNumberedLine(currentTrimmed)
      ) {
        break
      }
      paragraphLines.push(current)
      index += 1
    }

    blocks.push(
      renderParagraph(paragraphLines.join("\n"), `block-${blockIndex}`),
    )
    blockIndex += 1
  }

  return blocks
}

type ChatMessageContentProps = {
  content: string
  markdown?: boolean
  className?: string
}

export function ChatMessageContent({
  content,
  markdown = false,
  className,
}: ChatMessageContentProps) {
  if (!content) return null

  if (!markdown) {
    return (
      <p className={cn("whitespace-pre-wrap", className)}>{content}</p>
    )
  }

  return (
    <div className={cn("space-y-2 [&_a]:break-all", className)}>
      {parseMarkdownBlocks(content)}
    </div>
  )
}
