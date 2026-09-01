import type { Prisma } from "@/generated/prisma/client"

const PREFIX = "AURA"
const SEQUENCE_WIDTH = 6

/**
 * Sequential per-year receipt number, e.g. AURA-2026-000123. Derived from the
 * highest existing number for the year so it stays gap-free and readable.
 * Call inside the same transaction that creates the payment.
 */
export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear()
  const prefix = `${PREFIX}-${year}-`

  const latest = await tx.payment.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  })

  const lastSequence = latest
    ? Number.parseInt(latest.receiptNumber.slice(prefix.length), 10)
    : 0
  const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1

  return `${prefix}${String(next).padStart(SEQUENCE_WIDTH, "0")}`
}
