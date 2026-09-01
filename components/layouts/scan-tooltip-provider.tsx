"use client"

import type { ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"

export function ScanTooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
}
