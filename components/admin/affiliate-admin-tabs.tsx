"use client"

import { useState, type ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"

export function AffiliateAdminTabs({
  applications,
  settings,
  payouts,
}: {
  applications: ReactNode
  settings: ReactNode
  payouts: ReactNode
}) {
  const [tab, setTab] = useState("applications")

  return (
    <Tabs value={tab} onValueChange={setTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="applications">Applications</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
      </TabsList>

      <TabsContent value="applications">{applications}</TabsContent>
      <TabsContent value="settings">{settings}</TabsContent>
      <TabsContent value="payouts">{payouts}</TabsContent>
    </Tabs>
  )
}
