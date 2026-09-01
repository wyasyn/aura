"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"

export function useTabSearchParam(validTabs: readonly string[], defaultTab: string) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [pendingTab, setPendingTab] = useState<string | null>(null)

  const tabParam = searchParams.get("tab")
  const tab = validTabs.includes(tabParam ?? "") ? tabParam! : defaultTab

  useEffect(() => {
    if (pendingTab === tab) {
      setPendingTab(null)
    }
  }, [tab, pendingTab])

  const setTab = useCallback(
    (value: string) => {
      if (value === tab) return

      setPendingTab(value)
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === defaultTab) {
          params.delete("tab")
        } else {
          params.set("tab", value)
        }
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      })
    },
    [defaultTab, pathname, router, searchParams, tab],
  )

  const tabPending = isPending ? (pendingTab ?? tab) : null

  return [tab, setTab, tabPending] as const
}
