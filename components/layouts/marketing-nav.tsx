import Link from "next/link"
import { IconArrowRight, IconLeaf } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#technology", label: "Technology" },
  { href: "#clinics", label: "For Clinics" },
  { href: "#faq", label: "FAQ" },
] as const

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur">
      <div className="mx-auto grid min-h-20 max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full border border-primary/30 text-primary">
            <IconLeaf className="size-7" />
          </span>
          <span className="font-display text-3xl font-semibold leading-none tracking-normal">
            Aurora SkinSense
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b-2 border-transparent py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground first:border-primary first:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/scan">
              Start Free Scan
              <IconArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
