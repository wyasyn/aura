import Link from "next/link"

import { LandingFooter } from "@/components/marketing/landing-footer"

/**
 * Shared chrome for the legal documents.
 *
 * Both pages were previously hand-built JSX with their own heading styles,
 * which made them drift. Structure lives here so the content files stay
 * readable as prose and a claim can be checked against the code beside it.
 */
export function LegalPage({
  eyebrow = "Legal",
  title,
  updated,
  version,
  intro,
  toc,
  children,
}: {
  eyebrow?: string
  title: string
  updated: string
  version: string
  intro?: React.ReactNode
  toc: { id: string; label: string }[]
  children: React.ReactNode
}) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-6 pt-32 pb-16">
        <header className="mb-10 space-y-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Version {version}. Last updated {updated}.
          </p>
          {intro ? (
            <div className="pt-2 text-sm leading-relaxed text-muted-foreground">
              {intro}
            </div>
          ) : null}
        </header>

        <nav
          aria-label="Contents"
          className="mb-12 rounded-2xl border border-border/60 bg-card/40 p-5"
        >
          <p className="mb-3 text-sm font-medium text-foreground">Contents</p>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {toc.map((entry, index) => (
              <li key={entry.id}>
                <Link
                  href={`#${entry.id}`}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {index + 1}. {entry.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </article>
      <LandingFooter />
    </>
  )
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="font-heading text-lg font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function LegalSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-sm font-medium text-foreground">{children}</h3>
  )
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>
}

export function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>
}

/**
 * Table for the retention schedule and the sub-processor list. Scrolls
 * horizontally on narrow screens rather than forcing the page to.
 */
export function LegalTable({
  caption,
  headers,
  rows,
}: {
  caption?: string
  headers: string[]
  rows: React.ReactNode[][]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[32rem] text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-muted/40 text-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2.5 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
