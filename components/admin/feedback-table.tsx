"use client"

import { IconStarFilled } from "@tabler/icons-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBand } from "@/lib/scan/format"
import type { AssessmentBand } from "@/lib/scan/types"

export type FeedbackTableRow = {
  id: string
  scanId: string
  createdAt: string
  rating: number
  message: string | null
  userName: string
  userEmail: string
  overallBand: string | null
}

type FeedbackTableProps = {
  rows: FeedbackTableRow[]
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <IconStarFilled
          key={index}
          className={
            index < rating ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground/30"
          }
        />
      ))}
    </div>
  )
}

export function FeedbackTable({ rows }: FeedbackTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-8 text-center text-sm text-muted-foreground">
        No scan feedback yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Band</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(row.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="font-medium text-foreground">{row.userName}</div>
                <div className="text-xs text-muted-foreground">{row.userEmail}</div>
              </TableCell>
              <TableCell className="capitalize">
                {row.overallBand
                  ? formatBand(row.overallBand as AssessmentBand)
                  : "—"}
              </TableCell>
              <TableCell>
                <StarDisplay rating={row.rating} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {row.message?.trim() || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
