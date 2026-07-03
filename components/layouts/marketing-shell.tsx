import { MarketingNav } from "@/components/layouts/marketing-nav"

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
