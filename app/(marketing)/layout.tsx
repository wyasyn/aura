import { MarketingLayoutClient } from "@/components/layouts/marketing-layout-client"

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <MarketingLayoutClient>{children}</MarketingLayoutClient>
}
