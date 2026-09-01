"use client"

import Link from "next/link"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ReportsPaginationProps = {
  page: number
  totalPages: number
  className?: string
}

function pageHref(page: number) {
  return page <= 1 ? "/reports" : `/reports?page=${page}`
}

export function ReportsPagination({
  page,
  totalPages,
  className,
}: ReportsPaginationProps) {
  if (totalPages <= 1) return null

  const prevPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)

  return (
    <nav
      aria-label="Reports pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page <= 1}
        >
          <Link
            href={pageHref(prevPage)}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            <IconChevronLeft className="size-3.5" />
            Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
        >
          <Link
            href={pageHref(nextPage)}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages ? "pointer-events-none opacity-50" : undefined
            }
          >
            Next
            <IconChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </nav>
  )
}
