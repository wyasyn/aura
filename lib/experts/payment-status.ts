import type { BookingStatus, PaymentStatus } from "@/generated/prisma/client"

export function toPaymentStatus(status: BookingStatus): PaymentStatus {
  switch (status) {
    case "confirmed":
    case "completed":
      return "succeeded"
    case "cancelled":
    case "no_show":
      return "failed"
    default:
      return "pending"
  }
}
