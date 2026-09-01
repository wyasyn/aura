"use client"

import { useState } from "react"
import { IconDownload, IconReceipt } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { downloadReceiptPdf } from "@/lib/billing/download-receipt-pdf"
import type { PaymentStatus } from "@/generated/prisma/client"
import { formatMoneyCents } from "@/lib/payments/format"

export type PaymentRow = {
  id: string
  receiptNumber: string
  status: PaymentStatus
  amountCents: number
  currency: string
  description: string
  scanCount: number
  cardLabel: string | null
  createdAt: string
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  requires_action: "Needs verification",
  succeeded: "Paid",
  failed: "Failed",
  refunded: "Refunded",
}

export function PaymentHistoryClient({ payments }: { payments: PaymentRow[] }) {
  const [downloading, setDownloading] = useState<string | null>(null)

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 p-8 text-center">
        <IconReceipt className="size-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          No payments yet. Your receipts will show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {payment.createdAt}
              </TableCell>
              <TableCell>
                <span className="font-medium">{payment.description}</span>
                <span className="block text-xs text-muted-foreground">
                  {payment.receiptNumber}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {payment.cardLabel ?? "Card"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    payment.status === "succeeded" ? "secondary" : "outline"
                  }
                  className="font-normal"
                >
                  {STATUS_LABELS[payment.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoneyCents(payment.amountCents, payment.currency)}
              </TableCell>
              <TableCell className="text-right">
                {payment.status === "succeeded" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={downloading === payment.id}
                    onClick={() =>
                      downloadReceiptPdf(payment.id, payment.receiptNumber, {
                        onStart: () => setDownloading(payment.id),
                        onFinish: () => setDownloading(null),
                      })
                    }
                  >
                    <IconDownload className="size-4" />
                    {downloading === payment.id ? "Preparing..." : "PDF"}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
