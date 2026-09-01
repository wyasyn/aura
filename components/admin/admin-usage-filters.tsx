"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { UsagePeriod, UsageSource } from "@/lib/admin/usage-analytics"
import { cn } from "@/lib/utils"

const PERIODS: { value: UsagePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
]

const SOURCES: { value: UsageSource; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scan", label: "Scans" },
  { value: "chat", label: "Chat" },
  { value: "guardrail", label: "Guardrail" },
  { value: "transcribe", label: "Transcription" },
]

type AdminUsageFiltersProps = {
  modelOptions: { modelId: string; displayName: string | null }[]
  className?: string
}

export function AdminUsageFilters({
  modelOptions,
  className,
}: AdminUsageFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const period = (searchParams.get("period") as UsagePeriod) || "30d"
  const source = (searchParams.get("source") as UsageSource) || "all"
  const modelId = searchParams.get("modelId") ?? "all"

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all" && key === "modelId") {
      params.delete("modelId")
    } else if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.replace(`/admin/usage?${params.toString()}`)
    })
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 surface-panel rounded-xl border border-border/60 p-4",
        isPending && "opacity-70",
        className,
      )}
    >
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Period</p>
        <Select value={period} onValueChange={(v) => updateParam("period", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Source</p>
        <Select value={source} onValueChange={(v) => updateParam("source", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Model</p>
        <Select
          value={modelId}
          onValueChange={(v) => updateParam("modelId", v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {modelOptions.map((model) => (
              <SelectItem key={model.modelId} value={model.modelId}>
                {model.displayName ?? model.modelId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="sm" asChild className="ml-auto">
        <Link href="/admin/models">Manage models</Link>
      </Button>
    </div>
  )
}
