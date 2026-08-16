import { MarketingNavbar } from "@/components/marketing/marketing-navbar"

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Skip to content
      </a>
      <MarketingNavbar />
      {/* No top offset: the navbar is transparent, so pages run underneath it
          and own the top padding that keeps content clear of the bar. */}
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  )
}
