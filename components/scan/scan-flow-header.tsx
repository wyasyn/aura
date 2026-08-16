"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import brandIcon from "@/app/icon.png"
import { ScanDashboardLink } from "@/components/scan/scan-close-button"
import { cn } from "@/lib/utils"

type ScanFlowHeaderProps = {
  trailing?: ReactNode
  className?: string
}

export function ScanFlowHeader({ trailing, className }: ScanFlowHeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex w-full max-w-2xl items-center justify-between gap-4",
        className,
      )}
    >
      <Link
        href="/dashboard"
        className="flex min-w-0 shrink items-center gap-2.5 text-foreground transition-colors hover:text-muted-foreground"
      >
        <Image
          src={brandIcon}
          alt=""
          width={32}
          height={32}
          className="size-7 shrink-0 rounded-md"
          style={{ width: "auto", height: "auto" }}
        />
        <span className="font-heading truncate text-sm font-medium tracking-wide">
          Aurora Organics
        </span>
      </Link>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {trailing}
        <ScanDashboardLink />
      </div>
    </div>
  )
}
