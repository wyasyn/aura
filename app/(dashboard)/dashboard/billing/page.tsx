import { Suspense } from "react"

import { BillingDetailsSection } from "@/components/billing/billing-details-section"
import { BillingSummary } from "@/components/billing/billing-summary"
import { PackCatalog } from "@/components/billing/pack-catalog"
import { PaymentHistory } from "@/components/billing/payment-history"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import {
  BillingDetailsSkeleton,
  BillingSummarySkeleton,
  PackCatalogSkeleton,
  PaymentHistorySkeleton,
} from "@/components/dashboard/skeletons/billing-skeletons"

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Billing"
        description="Your plan, scan packs, billing details, and receipts."
      />

      <Suspense fallback={<BillingSummarySkeleton />}>
        <BillingSummary />
      </Suspense>

      <Suspense fallback={<PackCatalogSkeleton />}>
        <PackCatalog />
      </Suspense>

      <Suspense fallback={<BillingDetailsSkeleton />}>
        <BillingDetailsSection />
      </Suspense>

      <Suspense fallback={<PaymentHistorySkeleton />}>
        <PaymentHistory />
      </Suspense>
    </div>
  )
}
