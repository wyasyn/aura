/**
 * Landing page sections, shared by the navbar and any in-page jump links so
 * the ids, labels and scroll behaviour cannot drift apart.
 */
export const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "benefits", label: "Benefits" },
  { id: "how-it-works", label: "How it works" },
  { id: "what-you-get", label: "What you get" },
  { id: "faq", label: "FAQ" },
] as const

export type SectionId = (typeof SECTIONS)[number]["id"]

/**
 * Scrolls to a section, returning false when the target is not on this page so
 * the caller can fall back to routing. Next's Link does not reliably scroll for
 * same-page hash hrefs, so jump links call this instead of relying on the hash.
 */
export function scrollToSection(id: SectionId): boolean {
  const element = document.getElementById(id)
  if (!element) return false

  element.scrollIntoView({ behavior: "smooth", block: "start" })
  return true
}
