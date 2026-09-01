"use client"

import type { ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"
import { useTabSearchParam } from "@/hooks/use-tab-search-param"

const TOKENS_TABS = ["pricing", "grant"] as const

type TokensTabsProps = {
  pricing: ReactNode
  grant: ReactNode
}

export function TokensTabs({ pricing, grant }: TokensTabsProps) {
  const [tab, setTab, tabPending] = useTabSearchParam(TOKENS_TABS, "pricing")

  return (
    <Tabs value={tab} onValueChange={setTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="pricing" pending={tabPending === "pricing"}>
          Pricing preferences
        </TabsTrigger>
        <TabsTrigger value="grant" pending={tabPending === "grant"}>
          Grant scans
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pricing" pending={tabPending === "pricing"}>
        {pricing}
      </TabsContent>
      <TabsContent value="grant" pending={tabPending === "grant"}>
        {grant}
      </TabsContent>
    </Tabs>
  )
}
