"use client"

import Link from "next/link"
import type { ErrorInfo } from "next/error"

import { Button } from "@/components/ui/button"

export default function DashboardError({ unstable_retry }: ErrorInfo) {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="font-heading text-xl font-medium">Connection hiccup</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We couldn&apos;t reach the database in time. Try again in a moment.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={unstable_retry}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
