"use client"

import { useState, type ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs"

export function ClinicAdminTabs({
  clinics,
  provision,
  plans,
}: {
  clinics: ReactNode
  provision: ReactNode
  plans: ReactNode
}) {
  const [tab, setTab] = useState("clinics")

  return (
    <Tabs value={tab} onValueChange={setTab} variant="underline" className="w-full">
      <TabsList className="w-full flex-wrap gap-x-1 gap-y-0">
        <TabsTrigger value="clinics">Clinics</TabsTrigger>
        <TabsTrigger value="provision">Add clinic</TabsTrigger>
        <TabsTrigger value="plans">Plans</TabsTrigger>
      </TabsList>

      <TabsContent value="clinics">{clinics}</TabsContent>
      <TabsContent value="provision">{provision}</TabsContent>
      <TabsContent value="plans">{plans}</TabsContent>
    </Tabs>
  )
}
